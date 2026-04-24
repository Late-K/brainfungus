import { NextRequest, NextResponse } from "next/server";

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

    const data = await response.json();

    // transform deezer response to include relevant fields
    const results = data.data
      ? data.data.map((item: any) => ({
          id: item.id.toString(),
          title: item.title || item.name,
          artist: item.artist ? item.artist.name : "Unknown",
          album: item.album ? item.album.title : "Unknown",
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
