import { NextRequest, NextResponse } from "next/server";
import { fetchDeezer } from "@/app/lib/deezerUtils";

interface RawDeezerTrackDetails {
  id?: number;
  preview?: string;
  title?: string;
  duration?: number;
  artist?: { name?: string };
  album?: { title?: string; cover_medium?: string };
}

type TrackResponse = {
  id: string;
  preview: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
};

// preview links are signed and expire after a while (the exp= in the url),
// so keep each one until shortly before then instead of asking deezer again
const EXPIRY_MARGIN_MS = 60_000;
const FALLBACK_CACHE_MS = 5 * 60_000;
const MAX_CACHED_TRACKS = 1000;
const trackCache = new Map<
  string,
  { track: TrackResponse; expiresAt: number }
>();

function previewExpiry(preview: string) {
  const exp = preview.match(/exp=(\d+)/)?.[1];
  return exp
    ? Number(exp) * 1000 - EXPIRY_MARGIN_MS
    : Date.now() + FALLBACK_CACHE_MS;
}

export async function GET(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get("id")?.trim();

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 },
      );
    }

    const cached = trackCache.get(trackId);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ track: cached.track }, { status: 200 });
    }

    const data = await fetchDeezer<RawDeezerTrackDetails>(
      `/track/${encodeURIComponent(trackId)}`,
    );

    const track: TrackResponse = {
      id: data?.id?.toString?.() || trackId,
      preview: typeof data?.preview === "string" ? data.preview : "",
      title: data?.title || "",
      artist: data?.artist?.name || "",
      album: data?.album?.title || "",
      image: data?.album?.cover_medium || "",
      duration: typeof data?.duration === "number" ? data.duration : 0,
    };

    if (track.preview) {
      // oldest entries go first once the cache is full
      if (trackCache.size >= MAX_CACHED_TRACKS) {
        trackCache.delete(trackCache.keys().next().value!);
      }
      trackCache.set(trackId, {
        track,
        expiresAt: previewExpiry(track.preview),
      });
    }

    return NextResponse.json({ track }, { status: 200 });
  } catch (error) {
    console.error("Error fetching Deezer track:", error);
    return NextResponse.json(
      { error: "Failed to fetch track from Deezer" },
      { status: 500 },
    );
  }
}
