import { FormEvent, useEffect, useRef, useState } from "react";
import { Pause, Play, Search, SkipBack, SkipForward } from "lucide-react";
import { Input } from "@/components/ui/input";
import { STATIONS, TONES, type Station, type Track } from "@/lib/music/catalog";
import { parseVideoId } from "@/lib/music/parse";
import { resolveTrack } from "@/lib/music/resolve";
import { searchCatalog, searchMore } from "@/lib/music/search";
import { currentTrack, useDeck } from "@/lib/music/store";
import { Stage } from "./stage";
import { DashCam } from "./dashcam";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function preferSongs(tracks: Track[]) {
  const noise = /\bmix\b|playlist|nonstop|throwback|compilation|dj set|\bhours?\b/i;
  const songs = tracks.filter((track) => !noise.test(track.title));
  return songs.length >= 5 ? songs : tracks;
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
  const paint = useDeck((s) => s.paint);
  const tone = useDeck((s) => s.tone);
  const play = useDeck((s) => s.play);
  const next = useDeck((s) => s.next);
  const prev = useDeck((s) => s.prev);
  const add = useDeck((s) => s.add);
  const load = useDeck((s) => s.load);
  const track = currentTrack({ queue, index });
  const station = STATIONS.find((item) => item.id === stationId);

  const [raw, setRaw] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finder, setFinder] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [hits, setHits] = useState<Track[]>([]);
  const [more, setMore] = useState<string | null>(null);
  const pickRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [command, setCommand] = useState<"play" | "pause" | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void Promise.resolve(useDeck.persist.rehydrate()).then(
      () => setReady(true),
      () => setReady(true),
    );
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const stop = (event: Event) => event.preventDefault();
    const stopWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    window.addEventListener("wheel", stopWheelZoom, { passive: false });

    let wake: WakeLockSentinel | null = null;
    let gone = false;
    const stayAwake = () => {
      if (gone || !("wakeLock" in navigator)) return;
      void navigator.wakeLock.request("screen").then(
        (sentinel) => {
          wake = sentinel;
        },
        () => {
          // A later tap retries if Chrome wants a gesture first.
        },
      );
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") stayAwake();
    };
    stayAwake();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pointerdown", stayAwake);

    return () => {
      gone = true;
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      window.removeEventListener("wheel", stopWheelZoom);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", stayAwake);
      void wake?.release();
    };
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

  async function openGenre(item: Station) {
    const ticket = pickRef.current + 1;
    pickRef.current = ticket;
    setPicking(item.id);
    setFinder(false);
    setNotice(null);
    try {
      const page = await searchCatalog({ data: { query: item.query } });
      if (ticket !== pickRef.current) return;
      load(preferSongs(page.tracks), 0, item.id);
      setMore(page.more);
    } catch (err) {
      if (ticket !== pickRef.current) return;
      if (item.tracks.length > 0) load(item.tracks, 0, item.id);
      setMore(null);
      setNotice(err instanceof Error ? err.message : "That genre did not load.");
    } finally {
      if (ticket === pickRef.current) setPicking(null);
    }
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const text = raw.trim();
    if (!text) return;
    setBusy(true);
    setNotice(null);
    try {
      if (parseVideoId(text)) {
        const resolved = await resolveTrack({ data: { raw: text } });
        add(resolved);
        setRaw("");
        setFinder(false);
        return;
      }
      const page = await searchCatalog({ data: { query: text } });
      setHits(page.tracks);
      setMore(page.more);
    } catch (err) {
      setHits([]);
      setMore(null);
      setNotice(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onMore() {
    if (!more) return;
    setBusy(true);
    setNotice(null);
    try {
      const page = await searchMore({ data: { token: more } });
      if (finder) {
        setHits((current) => {
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...page.tracks.filter((item) => !seen.has(item.id))];
        });
      } else {
        const seen = new Set(queue.map((item) => item.id));
        const next = [...queue, ...page.tracks.filter((item) => !seen.has(item.id))];
        load(next, index, stationId);
      }
      setMore(page.more);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "No further songs.");
    } finally {
      setBusy(false);
    }
  }

  const hours = now.getHours();
  const meridian = hours >= 12 ? "PM" : "AM";
  const hourFace = String(hours % 12 || 12);
  const minuteFace = pad(now.getMinutes());

  return (
    <div className="deck" data-tone={tone}>
      <div className="dash" data-finder={finder}>
        <header className="bezel">
          <div className="swatches" role="group" aria-label="Color">
            {TONES.map((item) => (
              <button
                key={item}
                type="button"
                className="swatch"
                data-tone={item}
                data-on={item === tone}
                aria-label={item}
                aria-pressed={item === tone}
                onClick={() => paint(item)}
              />
            ))}
          </div>
          <strong>Receiver</strong>
          <span>{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
        </header>

        <div className="screen">
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

          <section className="cluster">
            <div>
              <p className="meridian">{meridian}</p>
              <p className="wall">
                {hourFace}:{minuteFace}
              </p>
            </div>
            <div className="min-w-0">
              <h2 className="track-title">{track?.title ?? "Nothing queued"}</h2>
              <p className="mt-1 truncate text-base text-muted">{track?.author ?? "Pick a station"}</p>
              <p className="elapsed mt-1">
                {clock(time.current)} <span className="text-muted">/ {clock(time.duration)}</span>
              </p>
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
            </div>
            <div className="transport">
              <button type="button" className="pad" aria-label="Previous" onClick={prev}>
                <SkipBack className="size-8" />
              </button>
              <button
                type="button"
                className="pad pad-play"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => setCommand(playing ? "pause" : "play")}
              >
                {playing ? <Pause className="size-10" /> : <Play className="size-10" />}
              </button>
              <button type="button" className="pad" aria-label="Next" onClick={next}>
                <SkipForward className="size-8" />
              </button>
            </div>
          </section>
        </div>

        <div className="dock">
          <button
            type="button"
            className="search-key"
            data-on={finder}
            aria-pressed={finder}
            onClick={() => setFinder((open) => !open)}
          >
            <Search className="size-6" />
            <span>Search</span>
          </button>
          <div className="stations" aria-label="Genres">
            {STATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="station"
                data-on={item.id === stationId || item.id === picking}
                onClick={() => void openGenre(item)}
              >
                <span className="station-art" data-tone={item.tone}>
                  {item.mark}
                </span>
                <span className="station-copy">
                  <span className="station-name">{item.name}</span>
                  <span className="station-note">{picking === item.id ? "Loading" : item.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {finder ? (
          <form className="finder" onSubmit={onAdd}>
            <div className="link-row">
              <label className="sr-only" htmlFor="link">
                Search YouTube Music
              </label>
              <Input
                id="link"
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                placeholder="Song, artist, or a link"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
              />
              <button className="load" type="submit" disabled={busy || raw.trim().length < 2}>
                {busy ? "…" : "Search"}
              </button>
            </div>
            <ol className="finder-list" aria-label="Search results">
              {hits.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="hit"
                    onClick={() => {
                      load(hits, i, "search");
                      setFinder(false);
                    }}
                  >
                    <span className="hit-title">{item.title}</span>
                    <span className="hit-author">{item.author}</span>
                  </button>
                </li>
              ))}
            </ol>
            {notice ? <p className="slot-note">{notice}</p> : null}
            {more ? (
              <button className="more" type="button" disabled={busy} onClick={onMore}>
                More songs
              </button>
            ) : null}
          </form>
        ) : (
          <div className="bay">
            <ol className="program" aria-label="Queue">
              {queue.map((item, i) => (
                <li key={`${item.id}-${i}`}>
                  <button
                    type="button"
                    className="program-row"
                    data-on={i === index}
                    onClick={() => play(i)}
                  >
                    <span className="program-no">{pad(i + 1)}</span>
                    <span className="program-title">{item.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            {more ? (
              <button className="more" type="button" disabled={busy} onClick={onMore}>
                More
              </button>
            ) : null}
            {notice ? <p className="slot-note">{notice}</p> : null}
          </div>
        )}
        <div className="underglow" />
      </div>
      <DashCam />
    </div>
  );
}
