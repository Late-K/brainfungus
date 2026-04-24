import { getAuthUser } from "@/app/lib/auth";
import {
  COLLECTIONS,
  getServerErrorStatus,
  normaliseSongId,
  requireBandMember,
} from "@/app/lib/serverData";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch a single setlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db, user } = await getAuthUser();

    const setlist = await db
      .collection(COLLECTIONS.setlists)
      .findOne({ _id: new ObjectId(id) });
    if (!setlist) {
      return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
    }

    await requireBandMember(db, user._id.toString(), setlist.bandId);

    // Enrich custom songs with their current audio metadata from customSongs collection
    const songs: Array<{
      id: string;
      isCustom?: boolean;
      [key: string]: unknown;
    }> = setlist.songs || [];
    const customIds = songs
      .filter((s) => s.isCustom)
      .map((s) => {
        try {
          return new ObjectId(s.id);
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);

    const customMeta: Record<string, { audioUrl?: string; duration?: number }> =
      {};
    if (customIds.length > 0) {
      const customDocs = await db
        .collection(COLLECTIONS.customSongs)
        .find(
          { _id: { $in: customIds } },
          { projection: { _id: 1, audioUrl: 1, duration: 1 } },
        )
        .toArray();
      for (const doc of customDocs) {
        customMeta[doc._id.toString()] = {
          audioUrl: doc.audioUrl,
          duration:
            typeof doc.duration === "number" && Number.isFinite(doc.duration)
              ? doc.duration
              : undefined,
        };
      }
    }

    const enrichedSongs = songs.map((song) => {
      const songId = normaliseSongId(song.id);
      if (!song.isCustom) return { ...song, id: songId };
      const meta = customMeta[songId];
      if (!meta) return { ...song, id: songId };
      return {
        ...song,
        id: songId,
        audioUrl: meta.audioUrl,
        duration:
          typeof meta.duration === "number" ? meta.duration : song.duration,
      };
    });

    return NextResponse.json(
      { setlist: { ...setlist, songs: enrichedSongs } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching setlist:", error);
    const status = getServerErrorStatus(error);
    return NextResponse.json(
      {
        error:
          status === 500 ? "Failed to fetch setlist" : (error as Error).message,
      },
      { status },
    );
  }
}
