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
  mark: string;
  note: string;
  query: string;
  tone: Tone;
  tracks: Track[];
};

export const STATIONS: Station[] = [
  {
    id: "rock",
    name: "Rock",
    mark: "RK",
    note: "Genre",
    query: "rock songs official video",
    tone: "amber",
    tracks: [
      { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", author: "Queen" },
      { id: "hTWKbfoikeg", title: "Smells Like Teen Spirit", author: "Nirvana" },
      { id: "kXYiU_JCYtU", title: "Numb", author: "Linkin Park" },
    ],
  },
  { id: "rap", name: "Rap", mark: "RAP", note: "Genre", query: "rap songs official video", tone: "rose", tracks: [] },
  { id: "country", name: "Country", mark: "CTY", note: "Genre", query: "country songs official video", tone: "gold", tracks: [] },
  { id: "rnb", name: "R&B", mark: "R&B", note: "Genre", query: "r&b songs official video", tone: "cobalt", tracks: [] },
  { id: "pop", name: "Pop", mark: "POP", note: "Genre", query: "pop songs official video", tone: "teal", tracks: [] },
  { id: "latin", name: "Latin", mark: "LAT", note: "Genre", query: "latin songs official video", tone: "amber", tracks: [] },
  { id: "electronic", name: "Electronic", mark: "EDM", note: "Genre", query: "electronic songs official video", tone: "teal", tracks: [] },
  { id: "jazz", name: "Jazz", mark: "JAZ", note: "Genre", query: "jazz songs official video", tone: "gold", tracks: [] },
  { id: "metal", name: "Metal", mark: "MTL", note: "Genre", query: "metal songs official video", tone: "rose", tracks: [] },
  { id: "indie", name: "Indie", mark: "IND", note: "Genre", query: "indie songs official video", tone: "cobalt", tracks: [] },
  { id: "soul", name: "Soul", mark: "SOL", note: "Genre", query: "soul songs official video", tone: "amber", tracks: [] },
  { id: "reggae", name: "Reggae", mark: "REG", note: "Genre", query: "reggae songs official video", tone: "teal", tracks: [] },
  { id: "blues", name: "Blues", mark: "BLU", note: "Genre", query: "blues songs official video", tone: "cobalt", tracks: [] },
  { id: "classical", name: "Classical", mark: "CLS", note: "Genre", query: "classical music official", tone: "gold", tracks: [] },
  { id: "folk", name: "Folk", mark: "FLK", note: "Genre", query: "folk songs official video", tone: "amber", tracks: [] },
  { id: "alternative", name: "Alternative", mark: "ALT", note: "Genre", query: "alternative songs official video", tone: "rose", tracks: [] },
];

export const DEFAULT_STATION = STATIONS[0];
