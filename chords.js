var notes = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb","B"];

var majorScales = {
    "C": ["C", "D", "E", "F", "G", "A", "B"],
    "D": ["D", "E", "F#", "G", "A", "B", "C#", "D"],
    "E": ["E", "F#", "G#", "A", "B", "C#", "D#", "E"],
    "F": ["F", "G", "A", "Bb", "C", "D", "E", "F"],
    "G": ["G", "A", "B", "C", "D", "E", "F#", "G"],
    "A": ["A", "B", "C#", "D", "E", "F#", "G#", "A"],
    "B": ["B", "C#", "D#", "E", "F#", "G#", "A#", "B"],
    "C#": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C", "Db"],
    "Db": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C", "Db"],
    "D#": ["Eb", "F", "G", "Ab", "Bb", "C", "D", "Eb"],
    "Eb": ["Eb", "F", "G", "Ab", "Bb", "C", "D", "Eb"],
    "F#": ["F#", "G#", "A#", "B", "C#", "D#", "F", "F#"],
    "Gb": ["F#", "G#", "A#", "B", "C#", "D#", "F", "F#"],
    "G#": ["Ab", "Bb", "C", "Db", "Eb", "F", "G", "Ab"],
    "Ab": ["Ab", "Bb", "C", "Db", "Eb", "F", "G", "Ab"],
    "A#": ["Bb", "C", "D", "Eb", "F", "G", "A", "Bb"],
    "Bb": ["Bb", "C", "D", "Eb", "F", "G", "A", "Bb"],
};

var chordsTypes = [
    {
      "notes": "1 3 5",
      "name": "major",
      "abbv": "major, , M",
      "scale-mode": "Ionian"
    },
    {
      "notes": "1 3 (5) 7",
      "name": "major seventh",
      "abbv": "maj7, Δ7, ma7, M7, Δ",
      "scale-mode": "Ionian"
    },
    {
      "notes": "1 3 (5) 7 9",
      "name": "major ninth",
      "abbv": "maj9",
      "scale-mode": "Ionian"
    },
    {
      "notes": "1 3 (5) 7 (9) (11) 13",
      "name": "major thirteenth",
      "abbv": "maj13",
      "scale-mode": "Ionian"
    },
    {
      "notes": "1 3 (5) 6",
      "name": "sixth",
      "abbv": "6, add6, add13",
      "scale-mode": "Ionian"
    },
    {
      "notes": "1 3 (5) 6 9",
      "name": "sixth/ninth",
      "abbv": "6/9, 69",
      "scale-mode": "Ionian"
    },
    {
      "notes": "1 3 (5) (7) ♯11 (9,13)",
      "name": "lydian",
      "abbv": "maj♯4, Δ♯4, Δ♯11",
      "scale-mode": "Lydian"
    },
    {
      "notes": "1 3 (5) (7) (9) b13 (11)",
      "name": "major seventh ♭6, or b13",
      "abbv": "maj7♭6, ma7♭6, M7♭6",
      "scale-mode": "Harmonic Maj"
    },
    {
      "notes": "1 3 (5) ♭7",
      "name": "dominant seventh",
      "abbv": "7, dom",
      "scale-mode": "Mixolydian"
    },
    {
      "notes": "1 3 (5) ♭7 9",
      "name": "dominant ninth",
      "abbv": "9",
      "scale-mode": "Mixolydian"
    },
    {
      "notes": "1 3 (5) ♭7 (9) 13",
      "name": "dominant thirteenth",
      "abbv": "13",
      "scale-mode": "Mixolydian"
    },
    {
      "notes": "1 3 (5) ♭7 ♯11 (9,13)",
      "name": "lydian dominant seventh",
      "abbv": "7♯11, 7♯4",
      "scale-mode": "Lydian Dominant (melodic minor 4th mode)"
    },
    {
      "notes": "1 3 (5) ♭7 ♭9 (♯9,♭5,6)",
      "name": "dominant ♭9",
      "abbv": "7♭9",
      "scale-mode": "Half-tone/tone (8 note scale), 1/2 step/whole step Diminished scale, Octatonic scale."
    },
    {
      "notes": "1 3 (5) ♭7 ♯9",
      "name": "dominant ♯9",
      "abbv": "7♯9",
      "scale-mode": "Mixolydian with ♭3"
    },
    {
      "notes": "1 3 ♭7 (♭9) (♭5,♭6,♯9)",
      "name": "altered",
      "abbv": "alt7",
      "scale-mode": "Locrian ♭4 (super-locrian)"
    },
    {
      "notes": "1 4 (5)",
      "name": "suspended 4th",
      "abbv": "sus4",
      "scale-mode": "Usually mixolydian"
    },
    {
      "notes": "1 2 (5)",
      "name": "suspended 2nd",
      "abbv": "sus2",
      "scale-mode": "Usually mixolydian"
    },
    {
      "notes": "1 4 (5) ♭7",
      "name": "suspended 4th seventh",
      "abbv": "7sus4",
      "scale-mode": "Usually mixolydian"
    },
    {
      "notes": "1 (5) ♭7 (9) 11",
      "name": "eleventh",
      "abbv": "11",
      "scale-mode": "Usually mixolydian"
    },
    {
      "notes": "1 4 (5) ♭7 (9) 11",
      "name": "eleventh (special voicing)",
      "abbv": "9sus4",
      "scale-mode": "Mixolydian"
    },
    {
      "notes": "1 4 (5) ♭9",
      "name": "suspended 4th ♭9",
      "abbv": "♭9sus, phryg",
      "scale-mode": "Phrygian or phrygian ♯6"
    },
    {
      "notes": "1 ♭3 5",
      "name": "minor",
      "abbv": "min, m, -",
      "scale-mode": "Dorian or aeolian"
    },
    {
      "notes": "1 ♭3 (5) ♭7",
      "name": "minor seventh",
      "abbv": "mi7, min7, m7, -7",
      "scale-mode": "Dorian or aeolian"
    },
    {
      "notes": "1 ♭3 (5) 7 (9, 13)",
      "name": "minor/major seventh",
      "abbv": "m/ma7, m/maj7, mM7, m/M7, -Δ7, mΔ",
      "scale-mode": "Minor melodic (ascending)"
    },
    {
      "notes": "1 ♭3 (5) 7 (9, b13)",
      "name": "minor/major seventh",
      "abbv": "m/ma7, m/maj7, mM7, m/M7, -Δ7, mΔ",
      "scale-mode": "Harmonic Minor"
    },
    {
      "notes": "1 ♭3 (5) 6",
      "name": "minor sixth",
      "abbv": "m6",
      "scale-mode": "Dorian"
    },
    {
      "notes": "1 ♭3 (5) ♭7 9",
      "name": "minor ninth",
      "abbv": "m9",
      "scale-mode": "Dorian or aeolian"
    },
    {
      "notes": "1 ♭3 (5) ♭7 (9) 11",
      "name": "minor eleventh",
      "abbv": "m11",
      "scale-mode": "Dorian or aeolian"
    },
    {
      "notes": "1 ♭3 (5) ♭7 (9) 11 (13)",
      "name": "minor thirteenth",
      "abbv": "m13",
      "scale-mode": "Dorian"
    },
    {
      "notes": "1 ♭3 ♭5",
      "name": "diminished",
      "abbv": "dim, °",
      "scale-mode": "Tone/Half-tone (8 note scale)"
    },
    {
      "notes": "1 ♭3 ♭5 ♭♭7",
      "name": "diminished seventh",
      "abbv": "dim7, °7",
      "scale-mode": "Tone/Half-tone (8 note scale)"
    },
    {
      "notes": "1 ♭3 ♭5 ♭7 (♭9,9,11,13)",
      "name": "half-diminished",
      "abbv": "m7♭5,ø",
      "scale-mode": "Locrian or locrian ♯2"
    },
    {
      "notes": "1 5",
      "name": "fifth",
      "abbv": "5, (no 3rd)",
      "scale-mode": "None"
    },
    {
      "notes": "1 3 ♯5",
      "name": "augmented",
      "abbv": "aug, +",
      "scale-mode": "Whole tone (6 note scale)"
    },
    {
      "notes": "1 3 ♯5 ♭7",
      "name": "augmented seventh",
      "abbv": "+7, aug7,7♯5",
      "scale-mode": "Whole tone (6 note scale)"
    },
    {
      "notes": "1 3 ♯5 7",
      "name": "augmented major seventh",
      "abbv": "augM7, +M7, M7♯5, M7(♯5), M7/♯5, M7+5, maj+7",
      "scale-mode": "Whole tone (6 note scale)"
    },
    {
      "notes": "1 3 (5) 7 9 ♯11",
      "name": "major ♯11 (lydian)",
      "abbv": "maj7♯11, Δ♯11, Δ♯4",
      "scale-mode": ""
    },
    {
      "notes": "1 3 (5) ♭7 ♯9",
      "name": "dominant ♯9",
      "abbv": "7♯9",
      "scale-mode": ""
    },
    {
      "notes": "1 4 (5) ♭7 ♭9",
      "name": "suspended ♭9 (phrygian)",
      "abbv": "♭9sus",
      "scale-mode": ""
    },
    // {
    //   "notes": "1 3 (5) ♭7 ♭9 ♯9 ♯11 b13",
    //   "name": "dominant altered (super-locrian)",
    //   "abbv": "7alt",
    //   "scale-mode": ""
    // }
  ]

  var notesDict = {
    "C":0,
    "C#":1,
    "Db":1,
    "D":2,
    "D#":3,
    "Eb":3,
    "E":4,
    "F":5,
    "F#":6,
    "Gb":6,
    "G":7,
    "G#":8,
    "Ab":8,
    "A":9,
    "A#":10,
    "Bb":10,
    "B":11
  }
  
var  getNote = (note,d) => {
    var baseDegree = d.trim().replace(/[^0-9]/g, "");
    var acc = "";
    if(baseDegree.indexOf("♭") > -1) {
        acc = "b";
    }
    if(baseDegree.indexOf("♯") > -1) {
        acc = "#";
    }
    return majorScales[note][(parseInt(baseDegree)-1)%7]+acc
}
export default chordsTypes.flatMap(f=>notes.map(note=>{
    var noteNum = 5-f.notes.split(" ").filter(n=>n[0]!=="(").length;
    var notesArr = f.notes.split(" ").reduce((a,n,i)=>{
      if(n[0]!=="("){
        a.push(getNote(note, n))
      }else{
        if(noteNum>0){
          a.push(getNote(note, n.replace(/[\(\)]/g, "")));
          noteNum--;
        }
      }
      return a;
    },[]);

    var notes = notesArr.map(n=>notesDict[n]+60);
    notes = [...notes, ...notes.map(f=>f+12), ...notes.map(f=>f+24)].slice(0,5)
    return {
        name:note + " " + f.name, 
        abbv:f.abbv.split(",").map(a=>note+a.trim()),
        noteNames:notesArr.join(" "),
        notes:notes
    }}))