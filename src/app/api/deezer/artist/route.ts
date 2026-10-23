import { NextRequest, NextResponse } from "next/server";
import {
  fetchDeezer,
  mapAlbum,
  mapArtist,
  mapTrack,
  RawDeezerAlbum,
  RawDeezerArtist,
  RawDeezerTrack,
  sortDiscography,
} from "@/app/lib/deezerUtils";

export async function GET(request: NextRequest) {
  try {
    const artistId = request.nextUrl.searchParams.get("id")?.trim();

    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID is required" },
        { status: 400 },
      );
    }

    const id = encodeURIComponent(artistId);
    const [artist, top, albums] = await Promise.all([
      fetchDeezer<RawDeezerArtist>(`/artist/${id}`),
      fetchDeezer<{ data?: RawDeezerTrack[] }>(`/artist/${id}/top?limit=10`),
      fetchDeezer<{ data?: RawDeezerAlbum[] }>(
        `/artist/${id}/albums?limit=100`,
      ),
    ]);

    return NextResponse.json(
      {
        artist: mapArtist(artist),
        topTracks: (top.data || []).map((item) => mapTrack(item)),
        albums: sortDiscography(albums.data || []).map((item) =>
          mapAlbum(item, artist.name),
        ),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching Deezer artist:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist from Deezer" },
      { status: 500 },
    );
  }
}
