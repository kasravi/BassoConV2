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
body.addEventListener('touchstart', function(e) {
  // Prevent the default action of touchstart
  e.preventDefault();
});

// Add a touchmove event listener to the body
body.addEventListener('touchmove', function(e) {
  // Prevent the default action of touchmove
  e.preventDefault();
});
// ------------------------------------ debug ------------------------------------
// window.onerror = (a, b, c, d, e) => {
//   //alert(`message: ${a}`+`, source: ${b}`+`, lineno: ${c}`+`, colno: ${d}`+`, error: ${e}`);

//   return true;
// };

// ------------------------------------ functionality ------------------------------------
// --------- Global variables
var chordsDict = {};
var sw, obxd, send = ()=>{};
var currentChordNumber = 0;
var loaded = false; //synths should load after user touch
var currentView = 1;
var scene=0;

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

function getCurrentChordNotes(i) {
  var chords = parseChords();
  var chord = chordsDict[chords[i || currentChordNumber]];
  var transpose = parseInt(document.getElementById("transpose").value);
  var octave = parseInt(document.getElementById("octave").value);
  return chord.notes.map((f) => f + 12 * octave + transpose);
}

// function getElementsAroundIndex(arr, index, width) {
//   const half = Math.floor(width/2);
//   if (index < half) {
//     return arr.slice(0, width);
//   }

//   if (index >= arr.length - half) {
//     return arr.slice(-width);
//   }
//   const start = Math.max(index - half, 0);
//   const end = Math.min(index + half, arr.length - 1);
//   const sliced = arr.slice(start, end + 1);

//   return sliced;
// }
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
function showChord() { // Display thr chord both on build page and the perform page
  var chords = parseChords();
  if(chords.length === 0){
    return;
  }
  const maxNumberOfChordsToShow = 5;
  let chordsToShow = chords.slice(0,10000000)
  var resultIndex = currentChordNumber
  var position;
  if(chords.length>maxNumberOfChordsToShow){
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
    if(chordsToShow.length<chords.length){
      if(position === 'end' || position === 'middle'){
        ht = '<span>...  </span>'+ht
      }
      if(position === 'start' || position === 'middle'){
        ht = ht+'<span>  ...</span>'
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
  showChord();
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
  var len = parseChords().length;
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

function playChord(force, chordIndex) {
  if (!loaded) {
    return;
  }
  var notes = getCurrentChordNotes(chordIndex);
  notes.forEach((n) => {
    send([0x90, n, Math.round(force * 127)]);
  });
}

function stopChord(i, progress = true) {
  if (!loaded) {
    return;
  }
  var notes = getCurrentChordNotes(i);
  notes.forEach((n) => {
    send([0x80, n, 0]);
  });
  if (progress) {
    progressChord();
  }
}

function changeForce(force) {
  if (!loaded) {
    return;
  }
  var notes = getCurrentChordNotes();
  notes.forEach((n) => {
    send([0xa0, n, Math.round(force * 127)]);
  });
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
async function bankChange() {
  var x = document.getElementById("banks").value;
  await obxd.loadBank("presets/" + x);
  loadPatches();
}
async function patchChange() {
  var x = document.getElementById("patches").value;
  obxd.selectPatch(parseInt(x));
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

var wait = t=>new Promise(r=>setTimeout(r,t));

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

function nextPatch(){
  var x = parseInt(document.getElementById("patches").value);
  obxd.selectPatch(x+1);
  document.getElementById("patches").value = x+1;
}

function prevPatch(){
  var x = Math.max(parseInt(document.getElementById("patches").value)-1,0);
  obxd.selectPatch(x);
  document.getElementById("patches").value = x;
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
  var name = document.getElementById("name").value;
  var bank = document.getElementById("banks").value;
  var patch = document.getElementById("patches").value;
  var chordsInp = document.getElementById("chords-input").value;
  var transpose = document.getElementById("transpose").value;
  var octave = document.getElementById("octave").value;
  var sendMidi = document.getElementById("send-midi").checked;
  var progress = document.getElementById("progress-check").checked;
  setStorage(name, {
    name: name,
    bank: bank,
    patch: patch,
    chords: chordsInp,
    transpose: transpose,
    octave: octave,
    sendMidi: sendMidi,
    progress: progress
  });
  reloadList()
}

function loadSavedItem(name) {
  if (!name) {
    var keys = Object.keys(localStorage);
    if (keys.length === 0) {
      document.getElementById("chords-input").value = "C7 E G";
      return;
    }
    name = keys[0];
  }
  var {
    name: name,
    bank: bank,
    patch: patch,
    chords: chordsInp,
    transpose: transpose,
    octave: octave,
    sendMidi: sendMidi,
    progress: progress
  } = getFromStorage(name);
  document.getElementById("name").value = name;

  document.getElementById("chords-input").value = chordsInp;
  document.getElementById("transpose").value = transpose;
  document.getElementById("octave").value = octave;
  document.getElementById("send-midi").checked = sendMidi;
  document.getElementById("progress-check").checked = progress;
  showChord();
  document.getElementById("banks").value = bank;
  bankChange().then(() => {
    document.getElementById("patches").value = parseInt(patch);
    patchChange();
  });
}

const reloadList = () => {
  var list = document.getElementById("list");
  list.innerHTML = "";
  var ul = document.createElement("ul");
  ul.className = "list-group";
  list.appendChild(ul);
  var keys = Object.keys(localStorage);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let song = document.createElement("li");
    const {
      name: name,
      bank: bank,
      patch: patch,
      chords: chordsInp,
      transpose: transpose,
      octave: octave,
      sendMidi: sendMidi,
      progress: progress
    } = getFromStorage(key);
    if(!(name || bank || patch || chordsInp || transpose || octave) || name !== key){
      continue;
    }
    song.className = "list-group-item";
    if (name === document.getElementById("name").value) {
      song.className += " active";
    }
    let container = document.createElement("div");
    container.style.cssText  = `display:flex;justify-content:space-between`;
    let nameElement = document.createElement("p");
    nameElement.id = "selectName"+i;
    nameElement.innerHTML = name;
    container.addEventListener("click", () => {
      loadSavedItem(name);
      currentView = 1;
      updateViews();
      reloadList();
    });
    let deleteElement = document.createElement("button");
    deleteElement.id = "deleteName"+i;
    deleteElement.className = "btn btn-dark"
    deleteElement.style.cssText  = "width:3rem"
    deleteElement.addEventListener("click", (event) => {
      event.stopPropagation(); 
      if(confirm(`delete ${name}?`)){
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

const connectMidi = (midiAccess)=>{
  const outputs = midiAccess.outputs.values();
      const output = outputs.next().value;
    
      // Check if an output is available
      if (!output) {
        alert("No MIDI output devices are available.");
        document.getElementById("send-midi").checked = false;
        sendMidiChanged();
        return;
      }
    
      send = (message) => {output.send(message)};
}

const sendMidiChanged = () => {
  
  if (document.getElementById("send-midi").checked) {
    document.getElementById("internal-synth").style.display = 'none';
    
    navigator.requestMIDIAccess().then(function(midiAccess) {
      // Get the first available MIDI output
      connectMidi(midiAccess);
      midiAccess.onstatechange = (event) => {
        connectMidi(midiAccess);
      };
    });
    
  } else {
    document.getElementById("internal-synth").style.display = 'block';
    send = (message) => {obxd.onMidi(message)};
  }
}

document.getElementById("send-midi").addEventListener("change", sendMidiChanged, false);
document.getElementById("reset").addEventListener("click", reset, false);
document.getElementById("name-button").addEventListener("click", save, false);
document.getElementById("banks").addEventListener("click", bankChange, false);
document.getElementById("ctrl1").addEventListener("click", () => {
  progressChord(true)
  showChord()
}, false);
document.getElementById("ctrl2").addEventListener("click", () => {
  progressChord()
  showChord()
}, false);

document
  .getElementById("patches")
  .addEventListener("click", patchChange, false);
document
  .getElementById("chords-input")
  .addEventListener("input", () => showChord());
Pressure.set("#play", {
  start: function (event) {
    playChord(event.pressure);
    document.getElementById("play").style.backgroundColor =
      "rgba(255, 255, 255, " + event.pressure / 10 + ")";
  },
  end: function () {
    stopChord(undefined, document.getElementById("progress-check").checked);
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
mc.get('swipe').set({ direction: Hammer.DIRECTION_ALL  });
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
  if(ev.type === "swipeup"){
    scene--;
  }else{
    scene++;
  };
  showChord()
  showScene()
});

const showScene = ()=>{
  for (var dom of document.getElementsByClassName("scene-number")){
  dom.innerText = scene+1;
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
  cl.addEventListener('change',()=>{
    var val = document.getElementById("common-chords").value;
    document.getElementById("chords-input").value = val;
  })
}

var commonRhythmArray = [
  "4-12345'",
  "1-12345 1-12345 1-12345 1-12345"
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
  cl.addEventListener('change',()=>{
    var val = document.getElementById("common-rhythms").value;
    document.getElementById("rhythm-input").value = val;
  })
}

loadCommonChords();
loadCommonRhythms();
showScene();
reloadList();
updateViews();
sendMidiChanged();
showChord();
