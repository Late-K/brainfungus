import { NextRequest, NextResponse } from "next/server";
import {
  fetchDeezer,
  mapAlbum,
  mapTrack,
  RawDeezerAlbum,
  RawDeezerTrack,
} from "@/app/lib/deezerUtils";

export async function GET(request: NextRequest) {
  try {
    const albumId = request.nextUrl.searchParams.get("id")?.trim();

    if (!albumId) {
      return NextResponse.json(
        { error: "Album ID is required" },
        { status: 400 },
      );
    }

    const id = encodeURIComponent(albumId);
    const [album, tracks] = await Promise.all([
      fetchDeezer<RawDeezerAlbum>(`/album/${id}`),
      fetchDeezer<{ data?: RawDeezerTrack[] }>(`/album/${id}/tracks?limit=100`),
    ]);

    // album tracks don't carry their own album info, so fill it in
    const fallbackAlbum = {
      title: album.title,
      image: album.cover_medium || undefined,
    };

    return NextResponse.json(
      {
        album: mapAlbum(album),
        tracks: (tracks.data || []).map((item) =>
          mapTrack(item, fallbackAlbum),
        ),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching Deezer album:", error);
    return NextResponse.json(
      { error: "Failed to fetch album from Deezer" },
      { status: 500 },
    );
  }
}
