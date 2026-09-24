import { createServerFn } from "@tanstack/react-start";
import { parseVideoId, stripMarks } from "./parse";

export const resolveTrack = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object" || !("raw" in input)) {
      throw new Error("Paste a YouTube or YouTube Music link.");
    }
    const raw = (input as { raw: unknown }).raw;
    if (typeof raw !== "string") throw new Error("Paste a YouTube or YouTube Music link.");
    const text = raw.trim();
    if (text.length < 11 || text.length > 400) {
      throw new Error("That link doesn't look right.");
    }
    const id = parseVideoId(text);
    if (!id) throw new Error("Need a video link from YouTube or YouTube Music.");
    return { id };
  })
  .handler(async ({ data }) => {
    const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${data.id}`,
    )}`;
    try {
      const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
      if (!res.ok) return { id: data.id, title: "YouTube", author: "Unknown" };
      const json = (await res.json()) as { title?: string; author_name?: string };
      return {
        id: data.id,
        title: stripMarks(json.title ?? "") || "YouTube",
        author: stripMarks(json.author_name ?? "") || "Unknown",
      };
    } catch {
      return { id: data.id, title: "YouTube", author: "Unknown" };
    }
  });
