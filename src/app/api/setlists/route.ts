import {
  COLLECTIONS,
  getServerErrorStatus,
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/serverData";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch all setlists for a band
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

    const bandSetlists = await db
      .collection(COLLECTIONS.setlists)
      .find({ bandId: bandObjectId })
      .sort({ createdAt: -1 })
      .toArray();

    const allSongs: Array<{ id: string; isCustom?: boolean }> =
      bandSetlists.flatMap((setlist) => setlist.songs || []);
    const customIds = Array.from(
      new Set(allSongs.filter((song) => song.isCustom).map((song) => song.id)),
    )
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);

    const durationMap: Record<string, number> = {};
    if (customIds.length > 0) {
      const customDocs = await db
        .collection(COLLECTIONS.customSongs)
        .find(
          { _id: { $in: customIds } },
          { projection: { _id: 1, duration: 1 } },
        )
        .toArray();
      for (const doc of customDocs) {
        if (typeof doc.duration === "number" && Number.isFinite(doc.duration)) {
          durationMap[doc._id.toString()] = doc.duration;
        }
      }
    }

    const enrichedSetlists = bandSetlists.map((setlist) => ({
      ...setlist,
      songs: (setlist.songs || []).map(
        (song: { id: string; isCustom?: boolean; duration?: number }) => {
          const songId = normaliseSongId(song.id);
          return song.isCustom && durationMap[songId] !== undefined
            ? { ...song, id: songId, duration: durationMap[songId] }
            : { ...song, id: songId };
        },
      ),
    }));

    return NextResponse.json({ setlists: enrichedSetlists }, { status: 200 });
  } catch (error) {
    console.error("Error fetching setlists:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500
            ? "Failed to fetch setlists"
            : (error as Error).message,
      },
      { status },
    );
  }
}
