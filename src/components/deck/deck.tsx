import { FormEvent, useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATIONS } from "@/lib/music/catalog";
import { parseVideoId } from "@/lib/music/parse";
import { resolveTrack } from "@/lib/music/resolve";
import { currentTrack, useDeck } from "@/lib/music/store";
import { cn } from "@/lib/utils";
import { Stage } from "./stage";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function clock(total: number) {
  if (!Number.isFinite(total) || total < 0) return "0:00";
  const s = Math.floor(total % 60);
  const m = Math.floor(total / 60);
  return `${m}:${pad(s)}`;
}

export function Deck() {
  const stationId = useDeck((s) => s.stationId);
  const queue = useDeck((s) => s.queue);
  const index = useDeck((s) => s.index);
  const tune = useDeck((s) => s.tune);
  const play = useDeck((s) => s.play);
  const next = useDeck((s) => s.next);
  const prev = useDeck((s) => s.prev);
  const add = useDeck((s) => s.add);
  const remove = useDeck((s) => s.remove);
  const track = currentTrack({ queue, index });
  const station = STATIONS.find((item) => item.id === stationId);

  const [raw, setRaw] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [command, setCommand] = useState<"play" | "pause" | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.resolve(useDeck.persist.rehydrate()).then(
      () => setReady(true),
      () => setReady(true),
    );
  }, []);

  useEffect(() => {
    if (!track || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.author,
      album: station?.name ?? "Receiver",
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    try {
      navigator.mediaSession.setActionHandler("play", () => setCommand("play"));
      navigator.mediaSession.setActionHandler("pause", () => setCommand("pause"));
      navigator.mediaSession.setActionHandler("previoustrack", () => prev());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
    } catch {
      // Chrome may reject a handler before metadata sticks
    }
  }, [track, station, playing, prev, next]);

  useEffect(() => {
    setTime({ current: 0, duration: 0 });
    setPlaying(false);
  }, [track?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === " ") {
        event.preventDefault();
        setCommand(playing ? "pause" : "play");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, playing]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const id = parseVideoId(raw);
    if (!id) {
      setNotice("Paste a YouTube or YouTube Music link.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const resolved = await resolveTrack({ data: { raw } });
      add(resolved);
      setRaw("");
    } catch (err) {
      add({ id, title: "YouTube", author: "Unknown" });
      setRaw("");
      setNotice(err instanceof Error ? err.message : "Added without a title.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="deck">
      <aside className="rail">
        <div>
          <p className="text-sm text-subtle">Listening deck</p>
          <h1 className="display text-4xl leading-none text-fg">Receiver</h1>
        </div>
        <form onSubmit={onAdd} className="flex flex-col gap-2">
          <label className="text-sm text-muted" htmlFor="link">
            YouTube Music link
          </label>
          <div className="flex gap-2">
            <Input
              id="link"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder="music.youtube.com/watch…"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
            />
            <Button type="submit" disabled={busy || raw.trim().length === 0}>
              {busy ? "Adding" : "Add"}
            </Button>
          </div>
          {notice ? <p className="text-sm text-muted">{notice}</p> : null}
        </form>
        <div className="rail-scroll">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted">Stations</h2>
            <ul className="flex flex-col gap-1">
              {STATIONS.map((item, n) => {
                const active = item.id === stationId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => tune(item.id)}
                      className={cn(
                        "motion flex w-full items-baseline gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150 ease-soft",
                        active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg",
                      )}
                    >
                      <span className="w-6 shrink-0 text-sm tabular-nums text-subtle">
                        {String(n + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="display block text-2xl leading-none">{item.name}</span>
                        <span className="mt-1 block text-sm text-subtle">{item.note}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted">Queue</h2>
            <ul className="flex flex-col">
              {queue.map((item, i) => (
                <li key={`${item.id}-${i}`} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => play(i)}
                    className={cn(
                      "motion flex min-h-11 min-w-0 flex-1 items-baseline gap-3 rounded-sm px-3 py-2 text-left transition-colors duration-150 ease-soft",
                      i === index ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    <span className="w-6 shrink-0 text-sm tabular-nums text-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="block truncate text-sm text-subtle">{item.author}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="motion h-11 shrink-0 px-3 text-sm text-subtle hover:text-fg"
                    onClick={() => remove(i)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
      <main className="main">
        <div className="min-w-0">
          <p className="text-sm text-subtle">{station ? station.name : "Your queue"}</p>
          <h2 className="display text-5xl italic leading-none text-fg">{track?.title ?? "Nothing queued"}</h2>
          <p className="mt-2 text-base text-muted">{track?.author ?? "Add a link or pick a station"}</p>
        </div>
        {ready && track ? (
          <Stage
            videoId={track.id}
            onEnded={next}
            onPlaying={setPlaying}
            onTime={(current, duration) => setTime({ current, duration })}
            command={command}
            seekTo={seekTo}
            onCommandDone={() => {
              setCommand(null);
              setSeekTo(null);
            }}
          />
        ) : (
          <div className="stage" />
        )}
        <label className="block">
          <span className="sr-only">Position</span>
          <input
            className="scrub"
            type="range"
            min={0}
            max={time.duration || 0}
            step={1}
            value={Math.min(time.current, time.duration || 0)}
            disabled={time.duration <= 0}
            onChange={(event) => {
              const nextTime = Number(event.target.value);
              setTime((prev) => ({ ...prev, current: nextTime }));
              setSeekTo(nextTime);
            }}
          />
        </label>
        <div className="flex items-center gap-3">
          <Button variant="quiet" size="icon" aria-label="Previous" onClick={prev}>
            <SkipBack className="size-5" />
          </Button>
          <Button
            size="icon"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setCommand(playing ? "pause" : "play")}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button variant="quiet" size="icon" aria-label="Next" onClick={next}>
            <SkipForward className="size-5" />
          </Button>
          <p className="ml-auto text-sm tabular-nums text-muted">
            {clock(time.current)} <span className="text-subtle">/ {clock(time.duration)}</span>
          </p>
        </div>
        <p className="text-sm text-subtle">
          Paste a YouTube Music share link. Chrome plays it here, and the queue stays on this device.
        </p>
      </main>
    </div>
  );
}
