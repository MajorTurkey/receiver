import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_STATION, STATIONS, type Tone, type Track } from "./catalog";

type DeckState = {
  stationId: string;
  tone: Tone;
  queue: Track[];
  index: number;
  tune: (stationId: string) => void;
  paint: (tone: Tone) => void;
  play: (index: number) => void;
  next: () => void;
  prev: () => void;
  add: (track: Track) => void;
  remove: (index: number) => void;
};

export const useDeck = create<DeckState>()(
  persist(
    (set, get) => ({
      stationId: DEFAULT_STATION.id,
      tone: "amber",
      queue: DEFAULT_STATION.tracks,
      index: 0,
      tune: (stationId) => {
        const station = STATIONS.find((s) => s.id === stationId) ?? DEFAULT_STATION;
        set({ stationId: station.id, queue: station.tracks, index: 0 });
      },
      paint: (tone) => set({ tone }),
      play: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;
        set({ index });
      },
      next: () => {
        const { queue, index } = get();
        if (queue.length === 0) return;
        set({ index: (index + 1) % queue.length });
      },
      prev: () => {
        const { queue, index } = get();
        if (queue.length === 0) return;
        set({ index: (index - 1 + queue.length) % queue.length });
      },
      add: (track) => {
        const { queue } = get();
        const without = queue.filter((item) => item.id !== track.id);
        const nextQueue = [...without, track];
        set({ queue: nextQueue, index: nextQueue.length - 1, stationId: "custom" });
      },
      remove: (index) => {
        const { queue, index: current } = get();
        const nextQueue = queue.filter((_, i) => i !== index);
        if (nextQueue.length === 0) {
          set({
            stationId: DEFAULT_STATION.id,
            queue: DEFAULT_STATION.tracks,
            index: 0,
          });
          return;
        }
        let nextIndex = current;
        if (index < current) nextIndex = current - 1;
        if (index === current) nextIndex = Math.min(current, nextQueue.length - 1);
        set({ queue: nextQueue, index: nextIndex, stationId: "custom" });
      },
    }),
    { name: "receiver-deck", skipHydration: true },
  ),
);

export function currentTrack(state: Pick<DeckState, "queue" | "index">) {
  return state.queue[state.index] ?? state.queue[0] ?? null;
}
