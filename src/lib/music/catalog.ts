export type Track = {
  id: string;
  title: string;
  author: string;
};

export type Tone = "amber" | "teal" | "cobalt" | "rose" | "gold";

export const TONES: Tone[] = ["amber", "teal", "cobalt", "rose", "gold"];

export type Station = {
  id: string;
  name: string;
  note: string;
  tone: Tone;
  tracks: Track[];
};

export const STATIONS: Station[] = [
  {
    id: "late",
    name: "Late room",
    note: "Long mixes",
    tone: "amber",
    tracks: [
      { id: "jfKfPfyJRdk", title: "Beats to relax", author: "Lofi Girl" },
      { id: "lTRiuFIWV54", title: "1 A.M. session", author: "Lofi Girl" },
      { id: "7NOSDKb0HlU", title: "Study radio", author: "Chillhop Music" },
    ],
  },
  {
    id: "still",
    name: "Still",
    note: "Ambient",
    tone: "teal",
    tracks: [
      { id: "DWcJFNfaw9c", title: "Beats to sleep", author: "Lofi Girl" },
      { id: "2OEL4P1Rz04", title: "Hidden Valley", author: "Soothing Relaxation" },
      { id: "4xDzrJKXOOY", title: "Synthwave radio", author: "Lofi Girl" },
    ],
  },
  {
    id: "keys",
    name: "Keys",
    note: "Piano and jazz",
    tone: "cobalt",
    tracks: [
      { id: "9E6b3swbnWg", title: "Nocturne in E-flat", author: "Chopin" },
      { id: "kgx4WGK0oNU", title: "Jazz room", author: "Abao in Tokyo" },
      { id: "mQER0A0ej0M", title: "Hey Jude", author: "The Beatles" },
    ],
  },
  {
    id: "singles",
    name: "Singles",
    note: "Official videos",
    tone: "rose",
    tracks: [
      { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", author: "Queen" },
      { id: "kXYiU_JCYtU", title: "Numb", author: "Linkin Park" },
      { id: "YykjpeuMNEk", title: "Hymn for the Weekend", author: "Coldplay" },
      { id: "e-ORhEE9VVg", title: "Blank Space", author: "Taylor Swift" },
    ],
  },
];

export const DEFAULT_STATION = STATIONS[0];
