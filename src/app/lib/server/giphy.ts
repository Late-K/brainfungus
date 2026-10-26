import "server-only";

// giphy api client for the band chat's gif picker. searches go through our
// own /api/gifs route so the api key stays on the server

import { UserError } from "@/app/lib/actionResult";
import { RawGiphyGif, isGiphyId, mapGiphyGif } from "@/app/lib/giphyUtils";
import { ChatGif, GifSearchResponse } from "@/app/types";

const GIPHY_API = "https://api.giphy.com/v1/gifs";
const RATING = "pg-13";
export const GIF_PAGE_SIZE = 24;
// giphy stops paging search results after this
const MAX_OFFSET = 4999;

async function fetchGiphy<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) throw new UserError("GIF search isn't set up");

  const query = new URLSearchParams({ api_key: apiKey, ...params });
  const response = await fetch(`${GIPHY_API}${path}?${query}`);
  if (response.status === 404) throw new UserError("GIF not found");
  if (!response.ok) {
    throw new Error(`GIPHY API request failed (${response.status}): ${path}`);
  }
  return (await response.json()) as T;
}

type GiphyListResponse = {
  data?: RawGiphyGif[];
  pagination?: { total_count?: number; count?: number; offset?: number };
};

function toPage(data: GiphyListResponse, offset: number): GifSearchResponse {
  const gifs = (data.data ?? [])
    .map(mapGiphyGif)
    .filter((gif): gif is ChatGif => !!gif);
  const fetched = data.pagination?.count ?? data.data?.length ?? 0;
  const next = offset + fetched;
  const total = data.pagination?.total_count;
  return {
    gifs,
    nextOffset:
      fetched > 0 && next <= MAX_OFFSET && (total === undefined || next < total)
        ? next
        : null,
  };
}

// search results, or what's trending when there's no search
export async function listGifs(query: string, offset: number) {
  const params = {
    limit: String(GIF_PAGE_SIZE),
    offset: String(Math.min(Math.max(0, offset), MAX_OFFSET)),
    rating: RATING,
  };
  const data = query
    ? await fetchGiphy<GiphyListResponse>("/search", {
        ...params,
        q: query,
        lang: "en",
      })
    : await fetchGiphy<GiphyListResponse>("/trending", params);
  return toPage(data, offset);
}

// looks a gif up by id, so a message only ever holds urls giphy gave us
export async function getGif(id: string): Promise<ChatGif> {
  if (!isGiphyId(id)) throw new UserError("GIF not found");
  const data = await fetchGiphy<{ data?: RawGiphyGif }>(
    `/${encodeURIComponent(id)}`,
    { rating: RATING },
  );
  const gif = mapGiphyGif(data.data);
  if (!gif) throw new UserError("GIF not found");
  return gif;
}
