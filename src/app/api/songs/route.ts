import {
  getServerErrorStatus,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
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
        { projection: { audioData: 0, audioUrl: 0 } }, // exclude large binary/base64 fields
      )
      .sort({ createdAt: 1 })
      .toArray();

    const songs = bandSongs.map((song) => ({
      ...song,
      audioUrl: song.hasAudio
        ? `/api/songs/${(song._id as { toString(): string }).toString()}/audio`
        : undefined,
    }));

    return NextResponse.json({ songs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching songs:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to fetch songs" : (error as Error).message,
      },
      { status },
    );
  }
}
