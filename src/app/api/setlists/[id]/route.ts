import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch a single setlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const db = await getDb();

    const setlist = await db
      .collection("setlists")
      .findOne({ _id: new ObjectId(id) });
    if (!setlist) {
      return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
    }

    const currentUser = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const band = await db.collection("bands").findOne({ _id: setlist.bandId });
    if (!band || !band.memberIds.includes(currentUser._id.toString())) {
      return NextResponse.json(
        { error: "Not a member of this band" },
        { status: 403 },
      );
    }

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
      .filter(Boolean);

    const customMeta: Record<string, { audioUrl?: string; duration?: number }> =
      {};
    if (customIds.length > 0) {
      const customDocs = await db
        .collection("customSongs")
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
      if (!song.isCustom) return song;
      const meta = customMeta[song.id];
      if (!meta) return song;
      return {
        ...song,
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
    return NextResponse.json(
      { error: "Failed to fetch setlist" },
      { status: 500 },
    );
  }
}
