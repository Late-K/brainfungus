import { NextRequest, NextResponse } from "next/server";
import { DeezerSearchType } from "@/app/types";
import {
  fetchDeezer,
  filterTracksForQuery,
  mapAlbum,
  mapArtist,
  mapTrack,
  pickArtistsToExpand,
  rankAlbums,
  rankArtists,
  rankTracks,
  RawDeezerAlbum,
  RawDeezerArtist,
  RawDeezerTrack,
} from "@/app/lib/deezerUtils";

const SEARCH_TYPES: DeezerSearchType[] = ["track", "artist", "album"];
const RESULT_LIMIT = 20;
// fetch extra results so live versions / compilations can be ranked down
const FETCH_LIMIT = 50;

// check the top tracks of likely artists for originals that deezer's
// search index missed - failures here just fall back to the plain search
async function findMissingTracks(tracks: RawDeezerTrack[], query: string) {
  const artistIds = pickArtistsToExpand(tracks, query);
  const tops = await Promise.all(
    artistIds.map((id) =>
      fetchDeezer<{ data?: RawDeezerTrack[] }>(`/artist/${id}/top?limit=100`)
        .then((data) => data.data || [])
        .catch(() => []),
    ),
  );
  return filterTracksForQuery(tops.flat(), query);
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();
    const typeParam = request.nextUrl.searchParams.get("type") || "track";

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 },
      );
    }

    if (!SEARCH_TYPES.includes(typeParam as DeezerSearchType)) {
      return NextResponse.json(
        { error: "Invalid search type" },
        { status: 400 },
      );
    }
    const type = typeParam as DeezerSearchType;

    const data = await fetchDeezer<{ data?: unknown[] }>(
      `/search/${type}?q=${encodeURIComponent(query)}&limit=${FETCH_LIMIT}`,
    );
    const items = data.data || [];

    let results;
    if (type === "artist") {
      results = rankArtists(items as RawDeezerArtist[], query)
        .slice(0, RESULT_LIMIT)
        .map((item) => mapArtist(item));
    } else if (type === "album") {
      results = rankAlbums(items as RawDeezerAlbum[], query)
        .slice(0, RESULT_LIMIT)
        .map((item) => mapAlbum(item));
    } else {
      const tracks = items as RawDeezerTrack[];
      const extraTracks = await findMissingTracks(tracks, query);
      // put them first so deezer's result order doesn't bury them
      results = rankTracks([...extraTracks, ...tracks], query)
        .slice(0, RESULT_LIMIT)
        .map((item) => mapTrack(item));
    }

    return NextResponse.json({ type, results }, { status: 200 });
  } catch (error) {
    console.error("Error searching Deezer:", error);
    return NextResponse.json(
      { error: "Failed to search Deezer" },
      { status: 500 },
    );
  }
}
