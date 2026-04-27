import {
  getServerErrorStatus,
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// fetch all setlists for a band
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
      .collection("setlists")
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

    const customSongMap: Record<
      string,
      { title?: string; album?: string; duration?: number }
    > = {};
    if (customIds.length > 0) {
      const customDocs = await db
        .collection("custom_songs")
        .find(
          { _id: { $in: customIds } },
          { projection: { _id: 1, title: 1, album: 1, duration: 1 } },
        )
        .toArray();
      for (const doc of customDocs) {
        customSongMap[doc._id.toString()] = {
          title: doc.title,
          album: doc.album,
          duration:
            typeof doc.duration === "number" && Number.isFinite(doc.duration)
              ? doc.duration
              : undefined,
        };
      }
    }

    const enrichedSetlists = bandSetlists.map((setlist) => ({
      ...setlist,
      songs: (setlist.songs || []).map(
        (song: {
          id: string;
          isCustom?: boolean;
          title?: string;
          album?: string;
          duration?: number;
        }) => {
          const songId = normaliseSongId(song.id);
          if (!song.isCustom) return { ...song, id: songId };
          const meta = customSongMap[songId];
          if (!meta) return { ...song, id: songId };
          return {
            ...song,
            id: songId,
            title: meta.title ?? song.title,
            album: meta.album ?? song.album,
            duration: meta.duration ?? song.duration,
          };
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
