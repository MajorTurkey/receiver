const ID = /^[A-Za-z0-9_-]{11}$/;

const HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
]);

export function parseVideoId(raw: string): string | null {
  const text = raw.trim();
  if (ID.test(text)) return text;
  try {
    const url = new URL(text);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return ID.test(id) ? id : null;
    }
    if (!HOSTS.has(host)) return null;
    const v = url.searchParams.get("v");
    if (v && ID.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const key = parts[0];
    const id = parts[1] ?? "";
    if ((key === "embed" || key === "shorts" || key === "live" || key === "v") && ID.test(id)) {
      return id;
    }
  } catch {
    return null;
  }
  return null;
}

export function stripMarks(value: string) {
  return value
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
