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
// window.onerror = (a, b, c, d, e) => {
//   const message = `
//   message: ${a}
//   source: ${b}
//   lineno: ${c}
//   colno: ${d}
//   error: ${e}
//   --------
//   `;
//   document.getElementById("log").innerText += message;
//   console.log(message);
//   return true;
// };

// ------------------------------------ functionality ------------------------------------
// --------- Global variables
var chordsDict = {};
var actx, fadeOutNode, obxd, samplePlayer,samples, send = () => { };
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
      synth: "obxd",
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
        if (f.indexOf("!") > -1) gliss = true;
        f = f.replace(/[!v]/g, "");
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
function showChord() {
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
  currentBeat = 0;
  playChord(1, null, true);
}

function playNextChord() {
  progressChord();
  currentBeat = 0;
  playChord(1, null, true);
}

function playCurrentChord() {
  currentBeat = 0;
  playChord(1, null, true);
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
  currentBeat = 0;
  showChord();
}

const progressBeat = () => {
  var len = model.scenes[scene].rhythm.length;

  currentBeat++;

  currentBeat %= len;

  showBeat();
}


function playChord(force, chordIndex, overrideProgress) {
  if (!loaded) {
    return;
  }
  var notes = getCurrentChordNotes(chordIndex);
  if (model.scenes[scene].playOnBeat && model.scenes[scene].bpm > 0 && model.scenes[scene].rhythm.length > 0) {
    currentForce = force;
    playBeat(true, overrideProgress)
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
function playBeat(start, overrideProgress) {
  console.log(start, playing, getCurrentChordNotes())
  if (start) {
    stopRequested = false
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      if (model.scenes[scene].progress && !overrideProgress) {
        progressChord();

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
          setTimeout(() => send([0x90, n, Math.round(currentForce * 127)]), i * 1000 / 15);//TODO can rolled chord (mistakenly named gliss) timing can be changed
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
function createReverb(audioContext, time) {
  // Create the ConvolverNode for reverb effect
  const convolverNode = audioContext.createConvolver();

  // Create an AudioBuffer for the impulse response (reverb characteristics)
  const length = audioContext.sampleRate * time; // Change this to adjust reverb time (2 seconds in this example)
  const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
  const impulseL = impulse.getChannelData(0);
  const impulseR = impulse.getChannelData(1);

  // Fill the AudioBuffer with the impulse response data
  for (let i = 0; i < length; i++) {
    impulseL[i] = (Math.random() * 20 - 1) * Math.pow(1 - i / length, 2);
    impulseR[i] = (Math.random() * 20 - 1) * Math.pow(1 - i / length, 2);
  }

  // Set the AudioBuffer as the ConvolverNode's buffer
  convolverNode.buffer = impulse;

  // Connect the ConvolverNode to the audioContext's destination
  convolverNode.connect(audioContext.destination);

  return convolverNode;
}

const sampleChanged = (val)=>{
  samplePlayer = samples[val];
  model.scenes[scene].sample = val;
}

function loadSamples() {
  return new Promise((resolve, reject) => {
    samples = SampleLibrary.load({
      instruments: ['piano', 'guitar-acoustic', 'guitar-electric', 'guitar-nylon', 'xylophone'],
      baseUrl: "samples/"
    })
    Tone.Buffer.on('load', function () {

      // loop through instruments and set release, connect to master output
      for (var property in samples) {
        if (samples.hasOwnProperty(property)) {
          console.log(samples[property])
          samples[property].release = .5;
          samples[property].toMaster();
        }
      }

      samplePlayer = samples[model.scenes[scene].sample||'piano'];
      document.getElementById("select-instrumnets").addEventListener('change', function (v) {
        sampleChanged(v.target.value);
      })
      resolve();
    })
    Tone.Buffer.on('error', function () {
      reject("Failed loading samples");
    })
  })
}
async function loadSynth() {
  actx = new AudioContext();
  await WAM.OBXD.importScripts(actx);

  obxd = new WAM.OBXD(actx);

  // Master gain node to control overall volume
  const masterGain = actx.createGain();
  masterGain.gain.value = 1; // Adjust the overall volume (0 to 1)

  // Create a gain node for fading out the sound after the note ends
  fadeOutNode = actx.createGain();
  fadeOutNode.gain.setValueAtTime(1, actx.currentTime);
  fadeOutNode.gain.linearRampToValueAtTime(0, actx.currentTime + 0.05); // Adjust the fade-out duration as needed


  obxd.connect(masterGain);

  // Connect the master gain node to the audioContext destination
  masterGain.connect(actx.destination);


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
}

// Function to create or remove the delay (reverb) effect
function putReverb() {
  if (actx && obxd) {
    if (model.scenes[scene].reverb > 0) {
      // Create the reverb effect
      const reverbNode = createReverb(actx, model.scenes[scene].reverb);

      // Disconnect the oscillator from the master gain node
      obxd.disconnect();
      fadeOutNode.disconnect();

      // Connect the oscillator to the reverbNode
      obxd.connect(reverbNode);

      // Connect the reverbNode to its own gain node
      const reverbGain = actx.createGain();
      reverbNode.connect(reverbGain);
      reverbGain.connect(actx.destination);

      // Connect the fadeOutNode to the master gain node
      fadeOutNode.connect(actx.destination);
    } else {
      // Turn off the reverb effect

      // Disconnect the reverb node and reset connections
      obxd.disconnect();
      fadeOutNode.disconnect();

      // Reconnect the oscillator directly to the master gain node
      obxd.connect(actx.destination);

      // Connect the fadeOutNode to the master gain node
      fadeOutNode.connect(actx.destination);
    }
  }
}

async function bankChange(x) {
  if (!obxd) return;
  if (!x && !model.scenes[scene].bank) {
    await obxd.loadBank("presets/Designer/Kujashi-OBXD-Bank.fxb");
  } else if (x) {
    await obxd.loadBank("presets/" + x);
    model.scenes[scene].bank = x;
  } else if (model.scenes[scene].bank) {
    await obxd.loadBank("presets/" + model.scenes[scene].bank);
  }

  loadPatches();
}
function patchChange(x) {
  model.scenes[scene].patch = x;
  if (!obxd) return;
  if (!x && !model.scenes[scene].patch) {
    obxd.selectPatch(31);
  } else if (x) {
    obxd.selectPatch(x);
    model.scenes[scene].patch = x;
  } else if (model.scenes[scene].patch) {
    obxd.selectPatch(model.scenes[scene].patch);
  }
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

    loadSavedItem();
    reloadList();
    changeScene(null, 0);
    registerPressure();
    await loadSynth();
    await loadSamples();
    var el = document.getElementById("load");
    el.style.setProperty("display", "none", "important");
    loaded = true;
    await bankChange();
    patchChange();
    putReverb();
    //console.log((a,b)=>obxd.onMidi([0xB0, a, b]))
  } catch (e) {
    throw e//alert(e);
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
    .map(f => `${f.time}-${f.notes.join("")}${f.gliss ? "!" : ""}${f.ttb ? "v" : ""}`).join(" ");
  document.getElementById("transpose").value = model.scenes[scene].transpose;
  document.getElementById("octave").value = model.scenes[scene].octave;
  document.getElementById("synth").value = model.scenes[scene].synth;
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
  document.getElementById("reverb").value = model.scenes[scene].reverb
  synthChanged();
  if (model.scenes.length > 1) document.getElementById("delete-scene").style.display = "block";

  updatePerformView();
}

const updatePerformView = () => {
  document.getElementById("play-container").innerHTML = "";
  for (let i = 0; i < model.scenes.length; i++) {
    document.getElementById("play-container").innerHTML += `
    <div style="height: ${100 / model.scenes.length}%; border: white solid 1px"
            class="d-flex flex-column justify-content-center align-items-center" id="play-${i}">
            <p style="font-size: 2rem; " id="current-chord-${i}">${chordsDict[model.scenes[i].chords[0]].name}</p>
          </div>
    `
  }
  registerPressure();
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
    document.getElementById("synth") = "obxd";
    synthChanged();
    return;
  }

  send = (message) => { output.send(message) };
}

const synthChanged = () => {
  model.scenes[scene].synth = document.getElementById("synth").value;
  if (model.scenes[scene].synth === "midi") {
    document.getElementById("internal-synth").style.display = 'none';

    navigator.requestMIDIAccess().then(function (midiAccess) {
      // Get the first available MIDI output
      connectMidi(midiAccess);
      midiAccess.onstatechange = (event) => {
        connectMidi(midiAccess);
      };
    });

  } else if (model.scenes[scene].synth === "sf") {
    send = (message) => {
      let [state, note, vel] = message;
      if (state = 0x90) {
        samplePlayer.triggerAttack(Tone.Frequency(note, "midi").toNote());
      } else if (state = 0x80) {
        samplePlayer.triggerRelease(Tone.Frequency(note, "midi").toNote());
      }
    }
    document.getElementById("internal-synth").style.display = 'none';
    document.getElementById("instruments").style.display = 'block';
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
  changeScene()

}

const deleteScene = () => {
  if (model.scenes.length === 1) return;
  model.scenes.splice(scene, 1);
  if (scene === 0) {
    changeScene()
  } else {
    changeScene(true)
  }
}

const paramChange = () => {
  model.scenes[scene].bpm = parseFloat(document.getElementById("bpm").value)
  model.scenes[scene].transpose = parseFloat(document.getElementById("transpose").value)
  model.scenes[scene].octave = parseFloat(document.getElementById("octave").value)
  model.scenes[scene].meter = parseFloat(document.getElementById("meter").value)
}

const reverbChanged = async () => {
  model.scenes[scene].reverb = parseFloat(document.getElementById("reverb").value);
  putReverb();
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
document.getElementById("synth").addEventListener("change", synthChanged);
document.getElementById("reset-scene").addEventListener("change", (e) => { model.scenes[scene].resetOnSceneChange = e.target.checked });
document.getElementById("play-on-beat").addEventListener("change", (e) => { model.scenes[scene].playOnBeat = e.target.checked });
document.getElementById("progress-check").addEventListener("change", (e) => { model.scenes[scene].progress = e.target.checked });
document.getElementById("reset").addEventListener("click", reset);
document.getElementById("name-button").addEventListener("click", save);
document.getElementById("name").addEventListener("change", nameChange);
document.getElementById("chords-input").addEventListener("input", chordsInpChange);
document.getElementById("rhythm-input").addEventListener("input", rhythmInpChange);
document.getElementById("banks").addEventListener("change", e => bankChange(e.target.value));
document.getElementById("new-scene").addEventListener("click", createScene)
document.getElementById("prev-scene").addEventListener("click", () => changeScene(true))
document.getElementById("next-scene").addEventListener("click", () => changeScene())
document.getElementById("delete-scene").addEventListener("click", deleteScene)
document.getElementById("bpm").addEventListener("input", paramChange)
document.getElementById("octave").addEventListener("input", paramChange)
document.getElementById("transpose").addEventListener("input", paramChange)
document.getElementById("meter").addEventListener("input", paramChange)
document.getElementById("reverb").addEventListener("input", reverbChanged)
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

var prevPlayingScene = null;
const registerPressure = () => {
  for (let i = 0; i < model.scenes.length; i++) {
    Pressure.set("#play-" + i, {
      start: function (event) {
        if (model.scenes[i].resetOnSceneChange && prevPlayingScene !== i) {
          changeScene(null, i)
          reset()
          prevPlayingScene = i;
        }

        var currentChord = chordsDict[model.scenes[i].chords[currentChordNumber]];
        document.getElementById("current-chord-" + i).innerHTML = currentChord.name;
        document.getElementById("play-" + i).style.backgroundColor =
          "rgba(255, 255, 255, " + event.pressure / 10 + ")";
        playChord(event.pressure);
      },
      end: function () {
        stopChord(undefined, model.scenes[scene].progress);
        document.getElementById("play-" + i).style.backgroundColor = "rgba(0, 0, 0, 0)";
      },
      change: function (force, event) {
        changeForce(force);
        document.getElementById("play-" + i).style.backgroundColor =
          "rgba(255, 255, 255, " + event.pressure / 10 + ")";
      },
    });
    preventLongPressMenu([document.getElementById("play-" + i)]);
  }
}


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
    if (i === currentView) {
      view.classList.add("active");
    } else {
      view.classList.remove("active");
    }
  });
}

mc.on("swipeleft swiperight", function (ev) {
  var s = ev.type === "swipeleft" ? -1 : 1;
  currentView = Math.max(Math.min(currentView + s, 2), 0);
  updateViews();
});

const changeScene = (up = false, sceneNumber) => {
  if (sceneNumber !== undefined) {
    scene = sceneNumber
  }
  else {
    if (up) {
      if (scene > 0) scene--;
    } else {
      if (scene < model.scenes.length - 1) scene++;
    };
    if (model.scenes[scene].resetOnScene) {
      currentChordNumber = 0;
    }
  }

  let nextSceneDom = document.getElementById("next-scene");
  let prevSceneDom = document.getElementById("prev-scene");
  let deleteSceneDom = document.getElementById("delete-scene");

  if (scene < model.scenes.length - 1) {
    nextSceneDom.disabled = false;
  } else {
    nextSceneDom.disabled = true;
  }
  if (scene > 0) {
    prevSceneDom.disabled = false;
  } else {
    prevSceneDom.disabled = true;
  }
  if (model.scenes.length > 1) {
    deleteSceneDom.disabled = false;
  } else {
    deleteSceneDom.disabled = true;
  }
  showChord()
  showScene()
};

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
  "4-12345! 4-12345!v",
  "1-12345 1-12345 1-12345 1-12345",
  "8-1 8-2 8-3 8-4 8-5 8-4 8-3 8-2",
  "8-1 8-2 8-3 8-4",
  "8-4 8-3 8-2 8-1",
]

function loadCommonRhythms() {
  document.getElementById("common-rhythms").innerHTML = "";
  for (var i = 0; i < commonRhythmArray.length; i++) {
    const option = document.createElement("option");
    option.value = commonRhythmArray[i];
    option.text = i + ": " + commonRhythmArray[i];

    document.getElementById("common-rhythms").appendChild(option);

  }
  document.getElementById("common-rhythms").addEventListener('change', (e) => {
    document.getElementById("rhythm-input").value = e.target.value;
    rhythmInpChange()
  })
}

loadCommonChords();
loadCommonRhythms();
showScene();
reloadList();
updateViews();
synthChanged();
showChord();

