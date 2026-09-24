import { useEffect, useRef, useState } from "react";

const ROLL_MS = 3 * 60 * 1000;

function clipType() {
  const types = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function saveClip(chunks: Blob[]) {
  if (!chunks.length) return;
  const type = chunks[0].type || "video/webm";
  const blob = new Blob(chunks, { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.href = url;
  link.download = `road-${stamp}.${type.includes("mp4") ? "mp4" : "webm"}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function DashCam() {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const liveRef = useRef(false);
  const rollRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      liveRef.current = false;
      if (rollRef.current) window.clearInterval(rollRef.current);
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function openRecorder(stream: MediaStream) {
    const mime = clipType();
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 700_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      saveClip(chunks);
      if (liveRef.current && streamRef.current) {
        recorderRef.current = openRecorder(streamRef.current);
        return;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
    };
    recorder.start();
    return recorder;
  }

  async function start() {
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser has no camera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 15, max: 15 },
        },
      });
      streamRef.current = stream;
      liveRef.current = true;
      try {
        recorderRef.current = openRecorder(stream);
      } catch {
        liveRef.current = false;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setNotice("This browser can't save video.");
        return;
      }
      setRecording(true);
      rollRef.current = window.setInterval(() => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, ROLL_MS);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setNotice(
        name === "NotAllowedError"
          ? "Camera blocked. Allow it in Chrome."
          : name === "NotFoundError"
            ? "No back camera on this device."
            : "Camera didn't start.",
      );
    }
  }

  function stop() {
    liveRef.current = false;
    if (rollRef.current) window.clearInterval(rollRef.current);
    rollRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className="cam">
      <button type="button" className="cam-btn" data-on={recording} aria-pressed={recording} onClick={recording ? stop : start}>
        {recording ? "Stop" : "Rec"}
      </button>
      {notice ? <p className="cam-note">{notice}</p> : null}
    </div>
  );
}
