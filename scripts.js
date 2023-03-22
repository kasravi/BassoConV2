import allChords from "./chords.js";
var chordsDict = {};
allChords.forEach((chord) => {
  chord.abbv.forEach((a) => {
    chordsDict[a] = chord;
  });
});

var sw, obxd;

var num = 0;
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
  var chord = chordsDict[chords[i || num]];
  var transpose = parseInt(document.getElementById("transpose").value);
  var octave = parseInt(document.getElementById("octave").value);
  return chord.notes.map((f) => f + 12 * octave + transpose);
}
function showChord() {
  var chords = parseChords();
  var currentChord = chordsDict[chords[num]];
  document.getElementById("current-chord").innerHTML = currentChord.name;
  var dom = document.getElementById("chords");
  var ht = "";
  chords
    .map((n) => chordsDict[n])
    .forEach((n, i) => {
      if (i === num) {
        ht +=
          "<span style='color:red;' id='chord" + i + "'>" + n.name + "</span>";
      } else {
        ht += "<span id='chord" + i + "'>" + n.name + "</span>";
      }
      ht += " ";
    });
  dom.innerHTML = ht;
}
var loaded = false;
function start() {
  num = 0;
  if (!loaded) {
    load();
  }
}

function reset() {
  num = 0;
  showChord();
}
function prev() {
  progressChord(true);
  playChord(1);
}
function next() {
  progressChord();
  playChord(1);
}
function cur() {
  playChord(1);
}
function progressChord(back = false) {
  var len = parseChords().length;
  if (back) {
    num--;
    if (num < 0) {
      num = len - 1;
    }
  } else {
    num++;

    num %= len;
  }
  showChord();
}
function playChord(force, i) {
  if (!loaded) {
    return;
  }
  var notes = getCurrentChordNotes(i);
  notes.forEach((n) => {
    obxd.onMidi([0x90, n, Math.round(force * 127)]);
  });
}
function stopChord(i, progress = true) {
  if (!loaded) {
    return;
  }
  var notes = getCurrentChordNotes(i);
  notes.forEach((n) => {
    obxd.onMidi([0x80, n, 0]);
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
    obxd.onMidi([0xa0, n, , Math.round(force * 127)]);
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
}

async function load() {
  try {
    await loadSynth();
    var el = document.getElementById("load");
    el.style.setProperty("display", "none", "important");
    loaded = true;
    loadSavedItem();
    reloadList();
  } catch (e) {
    alert(e);
  }
}

document.getElementById("load").addEventListener("click", start, false);
Pressure.set("#prev", {
  start: function (event) {
    prev();
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
    cur();
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
    next();
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
  setStorage(name, {
    bank: bank,
    patch: patch,
    chords: chordsInp,
    transpose: transpose,
    octave: octave,
  });
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
    bank: bank,
    patch: patch,
    chords: chordsInp,
    transpose: transpose,
    octave: octave,
  } = getFromStorage(name);
  document.getElementById("name").value = name;

  document.getElementById("chords-input").value = chordsInp;
  document.getElementById("transpose").value = transpose;
  document.getElementById("octave").value = octave;
  showChord();
  document.getElementById("banks").value = bank;
  bankChange().then(() => {
    document.getElementById("patches").value = patch;
    patchChange();
  });
}

function reloadList() {
  var list = document.getElementById("list");
  list.innerHTML = "";
  var ul = document.createElement("ul");
  ul.className = "list-group";
  list.appendChild(ul);
  var keys = Object.keys(localStorage);
  for (var i = 0; i < keys.length; i++) {
    var name = keys[i];
    var song = document.createElement("li");
    song.className = "list-group-item";
    if (name === document.getElementById("name").value) {
      song.className += " active";
    }
    song.innerHTML = name;

    ul.appendChild(song);
  }
  ul.addEventListener("click", function (e) {
    loadSavedItem(e.target.innerHTML);
    currentView = 1;
    reloadList();
    updateViews();
  });
}
document.getElementById("reset").addEventListener("click", reset, false);
document.getElementById("name-button").addEventListener("click", save, false);
document.getElementById("banks").addEventListener("click", bankChange, false);
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
    stopChord();
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

var tributeAttributes = {
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
var tributeAutocompleteTest = new Tribute(
  Object.assign(
    {
      menuContainer: document.getElementById("chords-container"),
    },
    tributeAttributes
  )
);
tributeAutocompleteTest.attach(document.getElementById("chords-input"));

var bodyElement = document.getElementsByTagName("body")[0];

var mc = new Hammer(bodyElement);
var currentView = 1;

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

updateViews();

mc.on("swipeleft swiperight", function (ev) {
  var s = ev.type === "swipeleft" ? -1 : 1;
  currentView = Math.max(Math.min(currentView + s, 2), 0);
  updateViews();
});

//showChord();
