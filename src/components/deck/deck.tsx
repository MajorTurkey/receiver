import { FormEvent, useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Input } from "@/components/ui/input";
import { STATIONS, type Tone } from "@/lib/music/catalog";
import { parseVideoId } from "@/lib/music/parse";
import { resolveTrack } from "@/lib/music/resolve";
import { currentTrack, useDeck } from "@/lib/music/store";
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
  const track = currentTrack({ queue, index });
  const station = STATIONS.find((item) => item.id === stationId);
  const tone: Tone = station?.tone ?? "gold";

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
    <div className="deck" data-tone={tone}>
      <div className="face">
        <header className="head">
          <div>
            <p className="text-sm font-semibold tracking-wide text-muted">Deck</p>
            <h1 className="brand">Receiver</h1>
          </div>
          <form onSubmit={onAdd} className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="link">
              YouTube Music link
            </label>
            <div className="link-row">
              <Input
                id="link"
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                placeholder="Paste a YouTube Music link"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
              />
              <button className="add" type="submit" disabled={busy || raw.trim().length === 0}>
                {busy ? "Adding" : "Add"}
              </button>
            </div>
            {notice ? <p className="mt-2 text-sm text-muted">{notice}</p> : null}
          </form>
        </header>

        <div className="keys" role="list">
          {STATIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="listitem"
              data-tone={item.tone}
              data-on={item.id === stationId}
              className="key"
              onClick={() => tune(item.id)}
            >
              <span className="key-name">{item.name}</span>
              <span className="key-note">{item.note}</span>
            </button>
          ))}
        </div>

        <div className="now">
          <p className="text-base font-semibold" style={{ color: "var(--lamp)" }}>
            {station ? station.name : "Your queue"}
          </p>
          <h2>{track?.title ?? "Nothing queued"}</h2>
          <p className="mt-1 text-lg text-muted">{track?.author ?? "Pick a station"}</p>
        </div>

        <div className="stage-wrap">
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
        </div>

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

        <div className="transport">
          <button type="button" className="pad pad-skip" aria-label="Previous" onClick={prev}>
            <SkipBack className="size-8" />
          </button>
          <button
            type="button"
            className="pad pad-play"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setCommand(playing ? "pause" : "play")}
          >
            {playing ? <Pause className="size-12" /> : <Play className="size-12" />}
          </button>
          <button type="button" className="pad pad-next pad-skip" aria-label="Next" onClick={next}>
            <SkipForward className="size-8" />
          </button>
          <p className="clock">
            {clock(time.current)}
            <span className="block text-sm font-medium text-muted">/ {clock(time.duration)}</span>
          </p>
        </div>

        <div className="queue" aria-label="Queue">
          {queue.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              type="button"
              className="chip"
              data-on={i === index}
              onClick={() => play(i)}
            >
              <span className="block truncate text-base font-semibold">{item.title}</span>
              <span className="block truncate text-sm opacity-80">{item.author}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
