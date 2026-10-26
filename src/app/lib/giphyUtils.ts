// turning giphy api results into the gifs the band chat shows. kept free of
// server-only imports so it can be unit tested (the api key lives in
// lib/server/giphy.ts)

import { ChatGif } from "@/app/types";

// what we read from a gif object in a giphy api response. giphy sends the
// sizes as strings
export type RawGiphyRendition = {
  url?: string;
  mp4?: string;
  webp?: string;
  width?: string;
  height?: string;
};

export type RawGiphyGif = {
  id?: string;
  title?: string;
  images?: {
    original?: RawGiphyRendition;
    fixed_width?: RawGiphyRendition;
  };
};

// giphy ids are short and alphanumeric
export function isGiphyId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9]{1,64}$/.test(id);
}

// only https links to giphy's own media hosts are ever shown in the chat
export function isGiphyUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "giphy.com" || url.hostname.endsWith(".giphy.com"))
    );
  } catch {
    return false;
  }
}

// the full size mp4 is what's sent (far smaller than the .gif), and the
// 200px wide animated webp is the preview in the picker
export function mapGiphyGif(raw: RawGiphyGif | undefined): ChatGif | null {
  const original = raw?.images?.original;
  const preview = raw?.images?.fixed_width;
  const url = original?.mp4;
  const previewUrl = preview?.webp || preview?.url;
  const width = Number(original?.width);
  const height = Number(original?.height);

  if (
    !isGiphyId(raw?.id) ||
    !isGiphyUrl(url) ||
    !isGiphyUrl(previewUrl) ||
    !(width > 0) ||
    !(height > 0)
  ) {
    return null;
  }

  return {
    id: raw.id,
    title: (raw.title || "").trim().slice(0, 200) || "GIF",
    url,
    previewUrl,
    width: Math.round(width),
    height: Math.round(height),
  };
}
