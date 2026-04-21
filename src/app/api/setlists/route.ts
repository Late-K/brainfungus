import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - fetch all setlists for a band
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bandId = request.nextUrl.searchParams.get("bandId");
    if (!bandId) {
      return NextResponse.json(
        { error: "Band ID is required" },
        { status: 400 },
      );
    }

    const db = await getDb();

    // verify user is part of the band
    const currentUser = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const band = await db
      .collection("bands")
      .findOne({ _id: new ObjectId(bandId) });
    if (!band) {
      return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    if (!band.memberIds.includes(currentUser._id.toString())) {
      return NextResponse.json(
        { error: "Not a member of this band" },
        { status: 403 },
      );
    }

    const bandSetlists = await db
      .collection("setlists")
      .find({ bandId: new ObjectId(bandId) })
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
      .filter(Boolean);

    const durationMap: Record<string, number> = {};
    if (customIds.length > 0) {
      const customDocs = await db
        .collection("customSongs")
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
        (song: { id: string; isCustom?: boolean; duration?: number }) =>
          song.isCustom && durationMap[song.id] !== undefined
            ? { ...song, duration: durationMap[song.id] }
            : song,
      ),
    }));

    return NextResponse.json({ setlists: enrichedSetlists }, { status: 200 });
  } catch (error) {
    console.error("Error fetching setlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch setlists" },
      { status: 500 },
    );
  }
}
