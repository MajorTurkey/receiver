import { useEffect, useRef } from "react";
import type { YTPlayer } from "@/types/youtube";

type StageProps = {
  videoId: string;
  onEnded: () => void;
  onPlaying: (playing: boolean) => void;
  onTime: (current: number, duration: number) => void;
  command: "play" | "pause" | null;
  seekTo: number | null;
  onCommandDone: () => void;
};

function loadApi() {
  if (window.YT?.Player) return;
  if (document.querySelector("script[data-yt-api]")) return;
  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  script.dataset.ytApi = "1";
  script.async = true;
  document.body.appendChild(script);
}

export function Stage({
  videoId,
  onEnded,
  onPlaying,
  onTime,
  command,
  seekTo,
  onCommandDone,
}: StageProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const modeRef = useRef<"api" | "iframe" | "pending">("pending");
  const videoRef = useRef(videoId);
  const armedRef = useRef(false);
  const endedRef = useRef(onEnded);
  const playingRef = useRef(onPlaying);
  const timeRef = useRef(onTime);
  videoRef.current = videoId;
  endedRef.current = onEnded;
  playingRef.current = onPlaying;
  timeRef.current = onTime;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    let dead = false;
    let timer = 0;
    let poll = 0;

    const readTime = () => {
      const player = playerRef.current;
      if (!player || modeRef.current !== "api") return;
      try {
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        if (Number.isFinite(current) && Number.isFinite(duration)) timeRef.current(current, duration);
      } catch {
        // player not ready
      }
    };

    const showIframe = () => {
      if (dead || !shell || modeRef.current === "iframe") return;
      modeRef.current = "iframe";
      try {
        playerRef.current?.destroy();
      } catch {
        // YouTube already detached the node
      }
      playerRef.current = null;
      shell.replaceChildren();
      const frame = document.createElement("iframe");
      frame.title = "YouTube player";
      frame.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.src = `https://www.youtube-nocookie.com/embed/${videoRef.current}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
      shell.appendChild(frame);
    };

    const mount = () => {
      if (dead || !shell || !window.YT?.Player || playerRef.current) return;
      window.clearTimeout(timer);
      shell.replaceChildren();
      const host = document.createElement("div");
      host.className = "yt-host";
      shell.appendChild(host);
      modeRef.current = "api";
      playerRef.current = new window.YT.Player(host, {
        videoId: videoRef.current,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event) => {
            const ended = window.YT?.PlayerState?.ENDED ?? 0;
            const playing = window.YT?.PlayerState?.PLAYING ?? 1;
            if (event.data === ended && armedRef.current) endedRef.current();
            playingRef.current(event.data === playing);
            readTime();
          },
          onError: () => showIframe(),
        },
      });
      poll = window.setInterval(readTime, 500);
    };

    timer = window.setTimeout(showIframe, 8000);

    if (window.YT?.Player) mount();
    else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        mount();
      };
      loadApi();
    }

    return () => {
      dead = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      modeRef.current = "pending";
      shell.replaceChildren();
    };
  }, []);

  useEffect(() => {
    armedRef.current = false;
    const arm = window.setTimeout(() => {
      armedRef.current = true;
    }, 1500);
    if (modeRef.current === "api" && playerRef.current) {
      try {
        playerRef.current.loadVideoById(videoId);
      } catch {
        // iframe fallback keeps the last src until a full remount
      }
    } else if (modeRef.current === "iframe") {
      const frame = shellRef.current?.querySelector("iframe");
      if (frame) {
        frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
      }
    }
    return () => window.clearTimeout(arm);
  }, [videoId]);

  useEffect(() => {
    if (seekTo == null) return;
    if (modeRef.current === "api" && playerRef.current) {
      try {
        playerRef.current.seekTo(seekTo, true);
      } catch {
        // ignore
      }
    }
    onCommandDone();
  }, [seekTo, onCommandDone]);

  useEffect(() => {
    if (!command) return;
    if (modeRef.current === "api" && playerRef.current) {
      try {
        if (command === "play") playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      } catch {
        // ignore
      }
    }
    onCommandDone();
  }, [command, onCommandDone]);

  return <div className="stage" ref={shellRef} />;
}
