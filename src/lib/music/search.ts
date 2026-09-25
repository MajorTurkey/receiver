import { createServerFn } from "@tanstack/react-start";
import type { Track } from "./catalog";
import { stripMarks } from "./parse";

const KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const ENDPOINT = `https://www.youtube.com/youtubei/v1/search?prettyPrint=false&key=${KEY}`;

export type SearchPage = {
  tracks: Track[];
  more: string | null;
};

function context() {
  return {
    client: {
      clientName: "WEB",
      clientVersion: "2.20260922.01.00",
      hl: "en",
      gl: "US",
    },
  };
}

function textOf(node: unknown) {
  if (!node || typeof node !== "object") return "";
  const record = node as { simpleText?: unknown; runs?: { text?: unknown }[] };
  if (typeof record.simpleText === "string") return record.simpleText;
  if (!Array.isArray(record.runs)) return "";
  return record.runs.map((run) => (typeof run?.text === "string" ? run.text : "")).join("");
}

function readPage(root: unknown): SearchPage {
  const tracks: Track[] = [];
  const seen = new Set<string>();
  let more: string | null = null;

  const walk = (node: unknown, depth: number) => {
    if (!node || depth > 30) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const video = record.videoRenderer;
    if (video && typeof video === "object") {
      const item = video as Record<string, unknown>;
      const id = item.videoId;
      const title = stripMarks(textOf(item.title));
      const author = stripMarks(textOf(item.ownerText)) || "YouTube Music";
      if (typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id) && title && !seen.has(id)) {
        seen.add(id);
        tracks.push({ id, title, author });
      }
    }
    if (!more && record.continuationItemRenderer && typeof record.continuationItemRenderer === "object") {
      const endpoint = (
        record.continuationItemRenderer as {
          continuationEndpoint?: { continuationCommand?: { token?: unknown } };
        }
      ).continuationEndpoint;
      const token = endpoint?.continuationCommand?.token;
      if (typeof token === "string" && token.length > 20 && token.length < 4000) more = token;
    }
    for (const value of Object.values(record)) walk(value, depth + 1);
  };

  walk(root, 0);
  return { tracks: tracks.slice(0, 24), more };
}

async function post(body: unknown) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("YouTube Music search is not answering.");
  return res.json();
}

export const searchCatalog = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object" || !("query" in input)) {
      throw new Error("Type a song or artist.");
    }
    const query = (input as { query: unknown }).query;
    if (typeof query !== "string") throw new Error("Type a song or artist.");
    const text = query.replace(/\s+/g, " ").trim();
    if (text.length < 2 || text.length > 120) throw new Error("Type a song or artist.");
    return { query: text };
  })
  .handler(async ({ data }) => {
    const page = readPage(await post({ context: context(), query: data.query }));
    if (page.tracks.length === 0) throw new Error("No songs for that search.");
    return page;
  });

export const searchMore = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object" || !("token" in input)) {
      throw new Error("No further songs.");
    }
    const token = (input as { token: unknown }).token;
    if (typeof token !== "string" || token.length < 20 || token.length > 4000) {
      throw new Error("No further songs.");
    }
    return { token };
  })
  .handler(async ({ data }) => {
    const page = readPage(await post({ context: context(), continuation: data.token }));
    if (page.tracks.length === 0) throw new Error("No further songs.");
    return page;
  });
