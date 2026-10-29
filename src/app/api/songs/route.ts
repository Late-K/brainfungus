import {
  serverErrorResponse,
  requireBandMemberContext,
} from "@/app/lib/server/utils";
import { albumImageKey, getAlbumImages } from "@/app/lib/server/customSongImages";
import { NextRequest, NextResponse } from "next/server";

// fetch all custom songs for a band
export async function GET(request: NextRequest) {
  try {
    const bandId = request.nextUrl.searchParams.get("bandId");
    if (!bandId) {
      return NextResponse.json(
        { error: "Band ID is required" },
        { status: 400 },
      );
    }

    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const bandSongs = await db
      .collection("custom_songs")
      .find(
        { bandId: bandObjectId },
        // exclude large binary/base64 fields and the private blob urls - audio
        // and images are served by /api/songs/[id]/audio and /image
        {
          projection: {
            audioData: 0,
            audioUrl: 0,
            audioBlobUrl: 0,
            audioBlobPathname: 0,
            imageBlobUrl: 0,
          },
        },
      )
      .sort({ createdAt: 1 })
      .toArray();

    const albumImages = await getAlbumImages(db, [bandObjectId]);

    const songs = bandSongs.map((song) => ({
      ...song,
      audioUrl: song.hasAudio
        ? `/api/songs/${(song._id as { toString(): string }).toString()}/audio`
        : undefined,
      albumImage: song.album
        ? albumImages.get(albumImageKey(bandObjectId, song.album as string))
        : undefined,
    }));

    return NextResponse.json({ songs }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch songs");
  }
}
