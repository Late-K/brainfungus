// shared deezer mapping + ranking helpers (server side)

import { DeezerAlbum, DeezerArtist, DeezerResult } from "@/app/types";

export const DEEZER_API = "https://api.deezer.com";

export interface RawDeezerTrack {
  id: number;
  title?: string;
  duration?: number;
  rank?: number;
  preview?: string | null;
  link?: string | null;
  artist?: { id?: number; name?: string };
  album?: { title?: string; cover_medium?: string | null };
}

export interface RawDeezerArtist {
  id: number;
  name?: string;
  picture_medium?: string | null;
  nb_album?: number;
  nb_fan?: number;
}

export interface RawDeezerAlbum {
  id: number;
  title?: string;
  cover_medium?: string | null;
  record_type?: string;
  release_date?: string;
  nb_tracks?: number;
  artist?: { name?: string };
}

// deezer allows ~50 requests per 5 seconds, which a page of audio players
// refreshing expired previews at once can go over - wait and try again
const QUOTA_ERROR_CODE = 4;
const QUOTA_RETRY_DELAYS_MS = [1500, 3000, 5000];

export async function fetchDeezer<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${DEEZER_API}${path}`);
    if (!response.ok) {
      throw new Error(`Deezer API request failed: ${path}`);
    }
    const data = await response.json();
    // deezer returns 200 with an error object for bad ids / quota issues
    if (data?.error) {
      if (
        data.error.code === QUOTA_ERROR_CODE &&
        attempt < QUOTA_RETRY_DELAYS_MS.length
      ) {
        // jitter so a burst of retries doesn't all land together again
        const delay = QUOTA_RETRY_DELAYS_MS[attempt] + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(data.error.message || "Deezer API error");
    }
    return data as T;
  }
}

export function mapTrack(
  item: RawDeezerTrack,
  fallbackAlbum?: { title?: string; image?: string },
): DeezerResult {
  return {
    id: item.id.toString(),
    title: item.title || "Unknown",
    artist: item.artist?.name || "Unknown",
    album: item.album?.title || fallbackAlbum?.title || "Unknown",
    duration: item.duration || 0,
    preview: item.preview || undefined,
    image: item.album?.cover_medium || fallbackAlbum?.image || undefined,
    url: item.link || undefined,
  };
}

export function mapArtist(item: RawDeezerArtist): DeezerArtist {
  return {
    id: item.id.toString(),
    name: item.name || "Unknown",
    image: item.picture_medium || undefined,
    albumCount: item.nb_album || 0,
    fanCount: item.nb_fan || 0,
  };
}

export function mapAlbum(
  item: RawDeezerAlbum,
  fallbackArtist?: string,
): DeezerAlbum {
  return {
    id: item.id.toString(),
    title: item.title || "Unknown",
    artist: item.artist?.name || fallbackArtist || "Unknown",
    image: item.cover_medium || undefined,
    recordType: item.record_type || "album",
    releaseDate: item.release_date || undefined,
    trackCount: item.nb_tracks || 0,
  };
}

// lowercase, strip accents and punctuation so "Don't Stop (Live)" ~ "dont stop live"
export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "Song (Live at Wembley) - 2011 Remaster" -> "song"
function baseTitle(title: string) {
  return normalize(title.replace(/\(.*?\)|\[.*?\]/g, "").split(" - ")[0]);
}

// knock-off uploads that are almost never what someone is looking for
const HEAVY_VARIANTS = [
  "karaoke",
  "tribute",
  "in the style of",
  "made famous",
  "originally performed",
  "cover",
  "backing track",
  "8 bit",
  "lullaby",
];
// real versions by the artist, but not the studio original
const MEDIUM_VARIANTS = [
  "live",
  "remix",
  "instrumental",
  "acoustic",
  "demo",
  "unplugged",
  "sped up",
  "slowed",
  "rehearsal",
  "session",
];
// alternate cuts of the same song (remasters aren't penalised, they're
// often the only copy of the original on deezer)
const LIGHT_VARIANTS = ["version", "edit", "mono", "mix"];

const hasWord = (text: string, word: string) =>
  new RegExp(`\\b${word}\\b`).test(text);

// album/artist `context` counts for heavy + medium tiers (so a "Live at
// Wembley" album flags its tracks), light tags only count in the title
function variantPenalty(title: string, context: string, query: string) {
  const flagged = (text: string, words: string[]) =>
    words.some((word) => hasWord(text, word) && !hasWord(query, word));

  if (flagged(`${title} ${context}`, HEAVY_VARIANTS)) return 80;
  if (flagged(`${title} ${context}`, MEDIUM_VARIANTS)) return 40;
  if (flagged(title, LIGHT_VARIANTS)) return 10;
  return 0;
}

function tokenCoverage(query: string, text: string) {
  const tokens = query.split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;
  const words = new Set(text.split(" "));
  return tokens.filter((token) => words.has(token)).length / tokens.length;
}

// whole-word containment so "one" doesn't match "someone"
const containsPhrase = (text: string, phrase: string) =>
  phrase.length > 0 && ` ${text} `.includes(` ${phrase} `);

const FILLER_WORDS = new Set([
  "the",
  "of",
  "and",
  "a",
  "an",
  "by",
  "ft",
  "feat",
]);

// loose check for whether the rest of the query (after the song title)
// refers to this artist - "queens", "queen of stone age" and "qotsa" all
// count for "queens of the stone age"
function mentionsArtist(query: string, base: string, artist: string) {
  if (!artist) return false;
  if (artist.length >= 3 && containsPhrase(query, artist)) return true;

  const rest = containsPhrase(query, base)
    ? ` ${query} `.replace(` ${base} `, " ").trim()
    : query;
  const tokens = rest
    .split(" ")
    .filter((token) => token && !FILLER_WORDS.has(token));
  if (tokens.length === 0) return false;

  const words = artist.split(" ").filter(Boolean);
  const acronym = words.map((word) => word[0]).join("");
  if (tokens.length === 1 && tokens[0].length >= 3 && tokens[0] === acronym) {
    return true;
  }

  // every leftover word has to be (the start of) a word in the artist name
  return tokens.every(
    (token) =>
      token.length >= 3 &&
      words.some(
        (word) =>
          word.startsWith(token) ||
          (word.length >= 3 && token.startsWith(word)),
      ),
  );
}

function scoreTrack(item: RawDeezerTrack, query: string, index: number) {
  const title = normalize(item.title || "");
  const base = baseTitle(item.title || "");
  const artist = normalize(item.artist?.name || "");
  const album = normalize(item.album?.title || "");

  let score = 0;

  // exact matches on "title", "artist title" or "title artist"
  if (
    base === query ||
    `${artist} ${base}` === query ||
    `${base} ${artist}` === query
  ) {
    score += 100;
  } else if (base && query.includes(base)) {
    score += 40;
  } else if (base.startsWith(query)) {
    score += 25;
  }

  if (mentionsArtist(query, base, artist)) score += 30;

  score += tokenCoverage(query, `${title} ${artist} ${album}`) * 40;

  // deezer rank is a popularity score up to ~1,000,000 - the original
  // recording is nearly always the most popular exact title match
  score += (Math.min(item.rank || 0, 1_000_000) / 1_000_000) * 60;

  score -= variantPenalty(title, `${album} ${artist}`, query);

  // keep deezer's own relevance as a tiebreaker
  score -= index;

  return score;
}

export function rankTracks(items: RawDeezerTrack[], rawQuery: string) {
  const query = normalize(rawQuery);
  const best = new Map<string, { item: RawDeezerTrack; score: number }>();

  items.forEach((item, index) => {
    const score = scoreTrack(item, query, index);
    // the same recording often appears on several compilations
    const key = `${normalize(item.title || "")}|${normalize(item.artist?.name || "")}`;
    const existing = best.get(key);
    if (!existing || score > existing.score) {
      best.set(key, { item, score });
    }
  });

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// deezer's search index sometimes leaves out the studio original entirely
// (e.g. "little sister queens of the stone age" only returns live/karaoke
// versions) even though it's in the artist's top tracks. pick artists worth
// checking: ones named in the query, or ones we only found variants of
const MAX_ARTISTS_TO_EXPAND = 2;

export function pickArtistsToExpand(items: RawDeezerTrack[], rawQuery: string) {
  const query = normalize(rawQuery);
  const named = new Map<number, number>();
  const variantOnly = new Map<number, number>();
  const hasOriginal = new Set<number>();

  for (const item of items) {
    const artistId = item.artist?.id;
    if (!artistId) continue;

    const artist = normalize(item.artist?.name || "");
    const title = normalize(item.title || "");
    const base = baseTitle(item.title || "");
    const rank = item.rank || 0;

    if (mentionsArtist(query, base, artist)) {
      named.set(artistId, Math.max(named.get(artistId) || 0, rank));
    }

    if (!containsPhrase(query, base)) continue;
    if (MEDIUM_VARIANTS.some((word) => hasWord(title, word))) {
      variantOnly.set(artistId, Math.max(variantOnly.get(artistId) || 0, rank));
    } else {
      hasOriginal.add(artistId);
    }
  }

  const byRank = (entries: Map<number, number>) =>
    [...entries.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

  const candidates = [
    ...byRank(named),
    ...byRank(variantOnly).filter((id) => !hasOriginal.has(id)),
  ];

  return [...new Set(candidates)].slice(0, MAX_ARTISTS_TO_EXPAND);
}

// keep only top tracks whose title is actually part of the search
export function filterTracksForQuery(
  items: RawDeezerTrack[],
  rawQuery: string,
) {
  const query = normalize(rawQuery);
  return items.filter((item) => {
    const base = baseTitle(item.title || "");
    return base.length > 0 && containsPhrase(query, base);
  });
}

export function rankArtists(items: RawDeezerArtist[], rawQuery: string) {
  const query = normalize(rawQuery);
  return [...items].sort((a, b) => {
    const aExact = normalize(a.name || "") === query ? 1 : 0;
    const bExact = normalize(b.name || "") === query ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return (b.nb_fan || 0) - (a.nb_fan || 0);
  });
}

function scoreAlbum(item: RawDeezerAlbum, query: string, index: number) {
  const title = normalize(item.title || "");
  const base = baseTitle(item.title || "");
  const artist = normalize(item.artist?.name || "");

  let score = 0;
  // searching just a band name in the albums tab should list their albums
  if (base === query || artist === query || `${artist} ${base}` === query) {
    score += 100;
  } else if (base && query.includes(base)) score += 40;
  if (artist && query.includes(artist)) score += 30;
  score += tokenCoverage(query, `${title} ${artist}`) * 40;
  if (item.record_type === "compile") score -= 30;
  score -= variantPenalty(title, artist, query);
  score -= index;
  return score;
}

export function rankAlbums(items: RawDeezerAlbum[], rawQuery: string) {
  const query = normalize(rawQuery);
  return items
    .map((item, index) => ({ item, score: scoreAlbum(item, query, index) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

const RECORD_TYPE_ORDER: Record<string, number> = {
  album: 0,
  ep: 1,
  single: 2,
  compile: 3,
};

// albums first, then EPs, then singles, newest first within each
export function sortDiscography(items: RawDeezerAlbum[]) {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = `${item.record_type}|${normalize(item.title || "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const typeDiff =
        (RECORD_TYPE_ORDER[a.record_type || ""] ?? 4) -
        (RECORD_TYPE_ORDER[b.record_type || ""] ?? 4);
      if (typeDiff !== 0) return typeDiff;
      return (b.release_date || "").localeCompare(a.release_date || "");
    });
}
