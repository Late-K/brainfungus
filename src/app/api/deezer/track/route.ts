import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get("id")?.trim();

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `https://api.deezer.com/track/${encodeURIComponent(trackId)}`,
    );

    if (!response.ok) {
      throw new Error("Deezer track lookup failed");
    }

    const data = await response.json();

    return NextResponse.json(
      {
        track: {
          id: data?.id?.toString?.() || trackId,
          preview: typeof data?.preview === "string" ? data.preview : "",
          title: data?.title || "",
          artist: data?.artist?.name || "",
          album: data?.album?.title || "",
          image: data?.album?.cover_medium || "",
          duration: typeof data?.duration === "number" ? data.duration : 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching Deezer track:", error);
    return NextResponse.json(
      { error: "Failed to fetch track from Deezer" },
      { status: 500 },
    );
  }
}
