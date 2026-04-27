import { NextRequest, NextResponse } from "next/server";

interface DeezerTrackResponse {
  id: number;
  title?: string;
  name?: string;
  duration?: number;
  preview?: string | null;
  link?: string | null;
  artist?: {
    name?: string;
  };
  album?: {
    title?: string;
    cover_medium?: string | null;
  };
  picture_medium?: string | null;
}

interface DeezerSearchResponse {
  data?: DeezerTrackResponse[];
  total?: number;
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    const type = request.nextUrl.searchParams.get("type") || "track"; // track, artist, album

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 },
      );
    }

    // call deezer API
    const response = await fetch(
      `https://api.deezer.com/search/${type}?q=${encodeURIComponent(query)}&limit=20`,
    );

    if (!response.ok) {
      throw new Error("Deezer API request failed");
    }

    const data: DeezerSearchResponse = await response.json();

    // transform deezer response to include relevant fields
    const results = data.data
      ? data.data.map((item: DeezerTrackResponse) => ({
          id: item.id.toString(),
          title: item.title || item.name,
          artist: item.artist?.name || "Unknown",
          album: item.album?.title || "Unknown",
          duration: item.duration || 0,
          preview: item.preview || null,
          image: item.album?.cover_medium || item.picture_medium || null,
          url: item.link || null,
        }))
      : [];

    return NextResponse.json(
      { results, total: data.total || 0 },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error searching Deezer:", error);
    return NextResponse.json(
      { error: "Failed to search Deezer" },
      { status: 500 },
    );
  }
}
