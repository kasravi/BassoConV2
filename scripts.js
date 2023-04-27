import allChords from "./chords.js";

// ------------------------------------ install ------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service worker registered.', reg))
      .catch((err) => console.log('Service worker registration failed.', err));
  });
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

function showInstallPrompt() {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return;
  }
  const installButton = document.querySelector('#install-button');
  installButton.style.display = 'block';
  installButton.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt.');
      } else {
        console.log('User dismissed the install prompt.');
      }
      deferredPrompt = null;
    });
  });
}
// ------------------------------------ prevent pull to refresh -----------------
const body = document.querySelector('body');

// Add a touchstart event listener to the body
body.addEventListener('touchstart', function (e) {
  // Prevent the default action of touchstart
  e.preventDefault();
});

// Add a touchmove event listener to the body
body.addEventListener('touchmove', function (e) {
  // Prevent the default action of touchmove
  e.preventDefault();
});
// ------------------------------------ debug ------------------------------------
window.onerror = (a, b, c, d, e) => {
  const message = `
  message: ${a}
  source: ${b}
  lineno: ${c}
  colno: ${d}
  error: ${e}
  --------
  `;
  document.getElementById("log").innerText += message;
  console.log(message);
  return true;
};

// ------------------------------------ functionality ------------------------------------
// --------- Global variables
var chordsDict = {};
var sw, obxd, send = () => { };
var currentChordNumber = 0;
var currentBeat = 0;
var playing = false;
var loaded = false; //synths should load after user touch
var currentView = 1;
var currentForce = 1;
var scene = 0;
var model = {
  name: "new",
  scenes: [
    {
      chords: ["C", "E", "F"],
      rhythm: [{ time: 1, notes: [1, 2, 3, 4, 5], ttb: false, gliss: true }],
      bank: "factory.fxb",
      patch: 0,
      transpose: 0,
      octave: 0,
      sendMidi: false,
      progress: true,
      playOnBeat: false,
      resetOnSceneChange: true,
      bpm: 60,
      meter: "4/4"
    }
  ]
}

allChords.forEach((chord) => {
  chord.abbv.forEach((a) => {
    chordsDict[a] = chord;
  });
});

// ---------- Functions
function parseChords() {
  var chords = document
    .getElementById("chords-input")
    .value.split(" ")
    .map((f) => f.trim())
    .filter((f) => f);
  return chords;
}

function parseRhythm() {
  var beats = document
    .getElementById("rhythm-input")
    .value.trim().split(" ")
    .map((f) => f.trim())
    .filter((f) => f)
    .map(f => {
      try {
        var ttb = false;
        var gliss = false;
        if (f.indexOf("v") > -1) ttb = true;
        if (f.indexOf("`") > -1) gliss = true;
        f = f.replace(/[`v]/g, "");
        var t = f.split("-");
        return { time: parseFloat(t[0]), notes: t[1].split("").map(f => parseInt(f)), ttb, gliss }
      }
      catch (e) {
        return;
      }
    }).filter(f => f);
  return beats;
}

function getCurrentChordNotes(i) {
  var chords = model.scenes[scene].chords;
  var chord = chordsDict[chords[i || currentChordNumber]];
  var transpose = model.scenes[scene].transpose;
  var octave = model.scenes[scene].octave;
  return chord.notes.map((f) => f + 12 * octave + transpose);
}

function getSubarrayWithIndex(arr, index, width) {
  const halfWidth = Math.floor(width / 2);
  let start = index - halfWidth;
  let end = start + width - 1;
  let result = '';

  if (start < 0) {
    end -= start;
    start = 0;
    result = 'start';
  } else if (end >= arr.length) {
    start -= end - arr.length + 1;
    end = arr.length - 1;
    result = 'end';
  } else {
    result = 'middle';
  }

  return {
    subarray: arr.slice(start, end + 1),
    indexInSubarray: index - start,
    position: result
  };
}
function showChord() { // Display the chord both on build page and the perform page
  var chords = model.scenes[scene].chords;
  if (chords.length === 0) {
    return;
  }
  const maxNumberOfChordsToShow = 5;
  let chordsToShow = chords.slice(0, 10000000)
  var resultIndex = currentChordNumber
  var position;
  if (chords.length > maxNumberOfChordsToShow) {
    const result = getSubarrayWithIndex(chords, currentChordNumber, maxNumberOfChordsToShow);
    chordsToShow = result.subarray;
    resultIndex = result.indexInSubarray;
    position = result.position;
  }
  var currentChord = chordsDict[chords[currentChordNumber]];
  document.getElementById("current-chord").innerHTML = currentChord.name;
  var dom = document.getElementById("chords");
  var ht = "";
  chordsToShow
    .map((n) => chordsDict[n])
    .forEach((n, i) => {
      if (i === resultIndex) {
        ht +=
          "<span style='color:red;' id='chord" + i + "'>" + n.name + "</span>";
      } else {
        ht += "<span id='chord" + i + "'>" + n.name + "</span>";
      }
      ht += " ";
    });
  if (chordsToShow.length < chords.length) {
    if (position === 'end' || position === 'middle') {
      ht = '<span>...  </span>' + ht
    }
    if (position === 'start' || position === 'middle') {
      ht = ht + '<span>  ...</span>'
    }
  }
  dom.innerHTML = ht;
}

function start() {
  currentChordNumber = 0;
  if (!loaded) {
    load();
  }
}

function reset() {
  currentChordNumber = 0;
  currentBeat = 0;
  showChord();
  showBeat();
}

function playPreviousChord() {
  progressChord(true);
  playChord(1);
}

function playNextChord() {
  progressChord();
  playChord(1);
}

function playCurrentChord() {
  playChord(1);
}

function progressChord(back = false) {
  var len = model.scenes[scene].chords.length;
  if (back) {
    currentChordNumber--;
    if (currentChordNumber < 0) {
      currentChordNumber = len - 1;
    }
  } else {
    currentChordNumber++;

    currentChordNumber %= len;
  }
  showChord();
}

const progressBeat = () => {
  var len = model.scenes[scene].rhythm.length;

  currentBeat++;

  currentBeat %= len;

  showBeat();
}


function playChord(force, chordIndex) {
  if (!loaded) {
    return;
  }
  var notes = getCurrentChordNotes(chordIndex);
  if (model.scenes[scene].playOnBeat && model.scenes[scene].bpm > 0 && model.scenes[scene].rhythm.length > 0) {
    currentForce = force;
    playBeat(true)
  } else {
    notes.forEach((n) => {
      send([0x90, n, Math.round(force * 127)]);
    });
  }
}

const getBeatTime = () => {
  const oneBeatTime = 60 / model.scenes[scene].bpm;
  const { time } = model.scenes[scene].rhythm[currentBeat]
  const stopTime = 1000 * oneBeatTime * (4 / time);
  return stopTime;
}

var timeoutHandle = null;
var stopRequested = false;
function playBeat(start) {
  console.log(start, playing, getCurrentChordNotes())
  if (start) {
    stopRequested = false
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      if (model.scenes[scene].progress) {
        progressChord();
        progressBeat()
      }
    }
    if (playing) {
      return;
    }
    playing = true;
  }
  const cnotes = getCurrentChordNotes();
  if (playing) {
    const { notes, ttb, gliss } = model.scenes[scene].rhythm[currentBeat];
    const notesDict = notes.reduce((a, f) => { a[f - 1] = true; return a }, {});
    let pnotes = cnotes.filter((f, i) => notesDict[i]);
    const stopTime = getBeatTime();
    if (ttb) {
      pnotes = pnotes.reverse();
    }
    setTimeout(() => {
      pnotes.forEach((n) => {
        send([0x80, n, 0]);
      });
      playBeat()
    }, stopTime);
    if (!stopRequested) {
      if (gliss) {
        pnotes.forEach((n, i) => {
          setTimeout(() => send([0x90, n, Math.round(currentForce * 127)]), i * stopTime / 10);
        })
      } else {
        pnotes.forEach((n, i) => {
          send([0x90, n, Math.round(currentForce * 127)]);
        })
      }
    }
    progressBeat();
  }
}

function stopChord(i, progress = true) {
  if (!loaded) {
    return;
  }
  stopRequested = true;
  if (playing) {
    timeoutHandle = setTimeout(() => {
      playing = false;
    }, getBeatTime())
  } else {
    currentBeat = 0
    var notes = getCurrentChordNotes(i);
    notes.forEach((n) => {
      send([0x80, n, 0]);
    });
    if (progress) {
      progressChord();
      progressBeat()
    }
  }

}

function changeForce(force) {
  if (!loaded) {
    return;
  }
  if (playing) {
    currentForce = force;
  } else {
    var notes = getCurrentChordNotes();
    notes.forEach((n) => {
      send([0xa0, n, Math.round(force * 127)]);
    });
  }
}

async function loadSynth() {
  let actx = new AudioContext();

  await WAM.OBXD.importScripts(actx);
  obxd = new WAM.OBXD(actx);
  obxd.connect(actx.destination);

  let gui = await obxd.loadGUI("skin");
  if (document.getElementById("controller").style.display !== "none") {
    frontpanel.appendChild(gui);
    container.style.width = gui.width + "px";
    frontpanel.style.height = gui.height + "px";
    frontpanel.className = container.className = "ready";

    let midikeys = new QwertyHancock({
      container: document.querySelector("#keys"),
      height: 60,
      octaves: 6,
      startNote: "C2",
      oct: 4,
      whiteNotesColour: "white",
      blackNotesColour: "black",
      activeColour: "orange",
    });
    midikeys.keyDown = (note, name) => obxd.onMidi([0x90, note, 100]);
    midikeys.keyUp = (note, name) => obxd.onMidi([0x80, note, 100]);
  }
  //await obxd.loadBank("presets/factory.fxb");Designer/Kujashi-OBXD-Bank.fxb
  await obxd.loadBank("presets/Designer/Kujashi-OBXD-Bank.fxb");
  loadPatches();
  obxd.selectPatch(31);
}
async function bankChange(x) {
  model.scenes[scene].bank = x;
  if (!obxd) return;
  await obxd.loadBank("presets/" + x);
  loadPatches();
}
function patchChange(x) {
  model.scenes[scene].patch = x;
  if (!obxd) return;
  obxd.selectPatch(x);
}
function loadPatches() {
  var array = obxd.patches;
  var patchList = document.getElementById("patches");
  patchList.innerHTML = "";
  for (var i = 0; i < array.length; i++) {
    var option = document.createElement("option");
    option.value = i;
    option.text = i + ": " + array[i];
    patchList.appendChild(option);
  }
  obxd.selectPatch(0);
}

var wait = t => new Promise(r => setTimeout(r, t));

async function load() {
  try {
    await loadSynth();
    var el = document.getElementById("load");
    el.style.setProperty("display", "none", "important");
    loaded = true;
    loadSavedItem();
    reloadList();
    //console.log((a,b)=>obxd.onMidi([0xB0, a, b]))
  } catch (e) {
    alert(e);
  }
}

// function controlChange(){
//   var param = document.getElementById("param").value;
//   var value = document.getElementById("paramVal").value;
//   obxd.onMidi([0xB0, param, value])
// }

function nextPatch() {
  var x = model.scenes[scene].patch;
  x++;
  obxd.selectPatch(x);
  document.getElementById("patches").value = x;//TODO max
  model.scenes[scene].patch = x;
}

function prevPatch() {
  var x = Math.max(model.scenes[scene].patch - 1, 0);
  obxd.selectPatch(x);
  document.getElementById("patches").value = x;
  model.scenes[scene].patch = x;
}
//document.getElementById("param").addEventListener("change", controlChange, false);
//document.getElementById("paramVal").addEventListener("change", controlChange, false);
document.getElementById("npatch").addEventListener("click", nextPatch, false);
document.getElementById("ppatch").addEventListener("click", prevPatch, false);
document.getElementById("load").addEventListener("click", start, false);
Pressure.set("#prev", {
  start: function (event) {
    playPreviousChord();
  },
  end: function () {
    stopChord(null, false);
  },
  change: function (force, event) {
    changeForce(force);
  },
});
Pressure.set("#cur", {
  start: function (event) {
    playCurrentChord();
  },
  end: function () {
    stopChord(null, false);
  },
  change: function (force, event) {
    changeForce(force);
  },
});
Pressure.set("#next", {
  start: function (event) {
    playNextChord();
  },
  end: function () {
    stopChord(null, false);
  },
  change: function (force, event) {
    changeForce(force);
  },
});

function setStorage(cname, cvalue) {
  localStorage.setItem(cname, JSON.stringify(cvalue));
}

function getFromStorage(cname) {
  return JSON.parse(localStorage.getItem(cname));
}

function save() {
  setStorage(model.name, model);
  reloadList()
}

const loadModelToUi = () => {

  document.getElementById("name").value = model.name;

  document.getElementById("chords-input").value = model.scenes[scene].chords.join(" ");
  document.getElementById("rhythm-input").value = model.scenes[scene].rhythm
    .map(f => `${f.time}-${f.notes.join("")}${f.gliss ? "`" : ""}${f.ttb ? "v" : ""}`).join(" ");
  document.getElementById("transpose").value = model.scenes[scene].transpose;
  document.getElementById("octave").value = model.scenes[scene].octave;
  document.getElementById("send-midi").checked = model.scenes[scene].sendMidi;
  document.getElementById("progress-check").checked = model.scenes[scene].progress;
  showChord();
  document.getElementById("banks").value = model.scenes[scene].bank;
  bankChange(model.scenes[scene].bank).then(() => {
    document.getElementById("patches").value = model.scenes[scene].patch;
    patchChange(model.scenes[scene].patch);
  });
  document.getElementById("play-on-beat").checked = model.scenes[scene].playOnBeat
  document.getElementById("reset-scene").checked = model.scenes[scene].resetOnSceneChange
  document.getElementById("bpm").value = model.scenes[scene].bpm
  document.getElementById("meter").value = model.scenes[scene].meter
  sendMidiChanged();
  if (model.scenes.length > 1) document.getElementById("delete-scene").style.display = "block";

}

function loadSavedItem(name) {
  if (!name) {
    var keys = getSavedItems();
    if (keys.length === 0) {
      scene = 0;
      loadModelToUi();
      return;
    }
    name = keys[0];
  }
  model = getFromStorage(name);
  scene = 0;
  loadModelToUi();
}

const getSavedItems = () => {
  let result = []
  var keys = Object.keys(localStorage);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const {
      name: name,
      scenes: scenes
    } = getFromStorage(key);
    if (!name || name !== key) {
      continue;
    }
    result.push(key)
  }
  return result;
}

const reloadList = () => {
  var list = document.getElementById("songs");
  list.innerHTML = "";
  var ul = document.createElement("ul");
  ul.className = "list-group";
  list.appendChild(ul);
  var keys = getSavedItems();
  for (let i = 0; i < keys.length; i++) {
    const name = keys[i];
    let song = document.createElement("li");

    song.className = "list-group-item";
    if (name === document.getElementById("name").value) {
      song.className += " active";
    }
    let container = document.createElement("div");
    container.style.cssText = `display:flex;justify-content:space-between`;
    let nameElement = document.createElement("p");
    nameElement.id = "selectName" + i;
    nameElement.innerHTML = name;
    container.addEventListener("click", () => {
      loadSavedItem(name);
      currentView = 1;
      updateViews();
      reloadList();
    });
    let deleteElement = document.createElement("button");
    deleteElement.id = "deleteName" + i;
    deleteElement.className = "btn btn-dark"
    deleteElement.style.cssText = "width:3rem"
    deleteElement.addEventListener("click", (event) => {
      event.stopPropagation();
      if (confirm(`delete ${name}?`)) {
        localStorage.removeItem(name);
        reloadList()
      }
    });
    deleteElement.innerHTML = "X";
    container.appendChild(nameElement)
    container.appendChild(deleteElement)
    song.appendChild(container)
    ul.appendChild(song);
  }

}

const connectMidi = (midiAccess) => {
  const outputs = midiAccess.outputs.values();
  const output = outputs.next().value;

  // Check if an output is available
  if (!output) {
    alert("No MIDI output devices are available.");
    document.getElementById("send-midi").checked = false;
    sendMidiChanged();
    return;
  }

  send = (message) => { output.send(message) };
}

const sendMidiChanged = () => {
  model.scenes[scene].sendMidi = document.getElementById("send-midi").checked;
  if (model.scenes[scene].sendMidi) {
    document.getElementById("internal-synth").style.display = 'none';

    navigator.requestMIDIAccess().then(function (midiAccess) {
      // Get the first available MIDI output
      connectMidi(midiAccess);
      midiAccess.onstatechange = (event) => {
        connectMidi(midiAccess);
      };
    });

  } else {
    document.getElementById("internal-synth").style.display = 'block';
    send = (message) => { obxd.onMidi(message) };
  }
}

const nameChange = () => {
  model.name = document.getElementById("name").value;
}

const chordsInpChange = () => {
  model.scenes[scene].chords = parseChords();
}

const rhythmInpChange = () => {
  model.scenes[scene].rhythm = parseRhythm();
}

const createScene = () => {
  var c = JSON.parse(JSON.stringify(model.scenes[scene]));
  model.scenes.splice(scene + 1, 0, c);
  scene++;
  showScene();
  document.getElementById("delete-scene").style.display = "block";
}

const deleteScene = () => {
  if (model.scenes.length === 1) return;
  model.scenes.splice(scene, 1);
  if (model.scenes.length === 1) document.getElementById("delete-scene").style.display = "none";
  showScene()
}

const bpmChange = () => {
  model.scenes[scene].bpm = parseFloat(document.getElementById("bpm").value)
}

const exportSongs = () => {
  const keys = getSavedItems();
  const data = JSON.stringify(keys.map(f => getFromStorage(f)), null, 4);
  const blob = new Blob([data], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'songs.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const fileInput = document.getElementById('import');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    const contents = JSON.parse(event.target.result);
    contents.forEach(f => { if (f.name) { setStorage(f.name, f) } })
    reloadList();
  };

  reader.readAsText(file);
});

document.getElementById("export").addEventListener("click", exportSongs);
document.getElementById("send-midi").addEventListener("change", sendMidiChanged);
document.getElementById("reset-scene").addEventListener("change", (e) => { model.scenes[scene].resetOnSceneChange = e.target.checked });
document.getElementById("play-on-beat").addEventListener("change", (e) => { model.scenes[scene].playOnBeat = e.target.checked });
document.getElementById("progress-check").addEventListener("change", (e) => { model.scenes[scene].progress = e.target.checked });
document.getElementById("reset").addEventListener("change", reset);
document.getElementById("name-button").addEventListener("click", save);
document.getElementById("name").addEventListener("change", nameChange);
document.getElementById("chords-input").addEventListener("input", chordsInpChange);
document.getElementById("rhythm-input").addEventListener("input", rhythmInpChange);
document.getElementById("banks").addEventListener("change", e => bankChange(e.target.value));
document.getElementById("create-scene").addEventListener("click", createScene)
document.getElementById("delete-scene").addEventListener("click", deleteScene)
document.getElementById("bpm").addEventListener("input", bpmChange)
document.getElementById("ctrl1").addEventListener("click", () => {
  progressChord(true)
  showChord()
});
document.getElementById("ctrl2").addEventListener("click", () => {
  progressChord()
  showChord()
});

document
  .getElementById("patches")
  .addEventListener("input", e => patchChange(e.target.value), false);
document
  .getElementById("chords-input")
  .addEventListener("input", () => showChord());

document.getElementById("log-button").addEventListener("click", () => {
  document.getElementById("log").style.display = "block";
});
Pressure.set("#play", {
  start: function (event) {
    playChord(event.pressure);
    document.getElementById("play").style.backgroundColor =
      "rgba(255, 255, 255, " + event.pressure / 10 + ")";
  },
  end: function () {
    stopChord(undefined, model.scenes[scene].progress);
    document.getElementById("play").style.backgroundColor = "rgba(0, 0, 0, 0)";
  },
  change: function (force, event) {
    changeForce(force);
    document.getElementById("play").style.backgroundColor =
      "rgba(255, 255, 255, " + event.pressure / 10 + ")";
  },
});

function absorbEvent_(event) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function preventLongPressMenu(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].ontouchstart = absorbEvent_;
    nodes[i].ontouchmove = absorbEvent_;
    nodes[i].ontouchend = absorbEvent_;
    nodes[i].ontouchcancel = absorbEvent_;
  }
}

preventLongPressMenu([document.getElementById("play")]);

const tributeAttributes = {
  autocompleteMode: true,
  noMatchTemplate: "",
  values: allChords.flatMap((c) => c.abbv).map((f) => ({ key: f, value: f })),
  selectTemplate: function (item) {
    if (typeof item === "undefined") return null;
    if (this.range.isContentEditable(this.current.element)) {
      return (
        '<span contenteditable="false"><a>' + item.original.key + "</a></span>"
      );
    }

    return item.original.value;
  },
  menuItemTemplate: function (item) {
    return item.string;
  },
};

const tributeAutocomplete = new Tribute(
  Object.assign(
    {
      menuContainer: document.getElementById("chords-container"),
    },
    tributeAttributes
  )
);

tributeAutocomplete.attach(document.getElementById("chords-input"));

const bodyElement = document.getElementsByTagName("body")[0];

const mc = new Hammer(bodyElement);
mc.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
function updateViews() {
  var views = [
    document.getElementById("list"),
    document.getElementById("build"),
    document.getElementById("perform"),
  ];
  views.forEach((view, i) => {
    if (i == currentView) {
      view.style.display = "block";
    } else {
      view.style.display = "none";
    }
  });
}

mc.on("swipeleft swiperight", function (ev) {
  var s = ev.type === "swipeleft" ? -1 : 1;
  currentView = Math.max(Math.min(currentView + s, 2), 0);
  updateViews();
});

mc.on("swipeup swipedown", function (ev) {
  if (ev.type === "swipeup") {
    if (scene > 0) scene--;
  } else {
    if (scene < model.scenes.length - 1) scene++;
  };
  if (model.scenes[scene].resetOnScene) {
    currentChordNumber = 0;
  }
  showChord()
  showScene()
});

const showScene = () => {
  for (var dom of document.getElementsByClassName("scene-number")) {
    dom.innerText = scene + 1;
  }
  loadModelToUi();
}

const showBeat = () => {
  for (var dom of document.getElementsByClassName("beat-number")) {
    dom.innerText = currentBeat + 1;
  }
}

var commonChordArray = [
  "C G Am F",
  "Am F C G",
  "C F G F",
  "C Am F G",
  "Dm G C Am",
]

function loadCommonChords() {
  var cl = document.getElementById("common-chords");
  cl.innerHTML = "";
  for (var i = 0; i < commonChordArray.length; i++) {
    const option = document.createElement("option");
    option.value = commonChordArray[i];
    option.text = i + ": " + commonChordArray[i];

    cl.appendChild(option);

  }
  cl.addEventListener('change', () => {
    var val = document.getElementById("common-chords").value;
    document.getElementById("chords-input").value = val;
    chordsInpChange()
  })
}

var commonRhythmArray = [
  "4-12345'",
  "1-12345 1-12345 1-12345 1-12345",
  "8-1 8-2 8-3 8-4 8-5 8-4 8-3 8-2",
  "8-1 8-2 8-3 8-4",
  "8-4 8-3 8-2 8-1",
]

function loadCommonRhythms() {
  var cl = document.getElementById("common-rhythms");
  cl.innerHTML = "";
  for (var i = 0; i < commonRhythmArray.length; i++) {
    const option = document.createElement("option");
    option.value = commonRhythmArray[i];
    option.text = i + ": " + commonRhythmArray[i];

    cl.appendChild(option);

  }
  cl.addEventListener('change', () => {
    var val = document.getElementById("common-rhythms").value;
    document.getElementById("rhythm-input").value = val;
    rhythmInpChange()
  })
}

loadCommonChords();
loadCommonRhythms();
showScene();
reloadList();
updateViews();
sendMidiChanged();
showChord();
