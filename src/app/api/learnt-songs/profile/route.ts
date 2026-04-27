import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { normaliseSongId } from "@/app/lib/serverUtils";
import { NextResponse } from "next/server";
import { ProfileLearntSong } from "@/app/types";

// fetch all learnt songs for the current user from the unified learnt_songs collection
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    const currentUser = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const learntEntries = await db
      .collection("learnt_songs")
      .find({ userId: currentUser._id, active: { $ne: false } })
      .sort({ createdAt: 1 })
      .toArray();

    const seen = new Set<string>();
    const songs: ProfileLearntSong[] = [];

    for (const entry of learntEntries) {
      const songId = normaliseSongId(entry.songId);
      if (seen.has(songId)) continue;
      seen.add(songId);

      songs.push({
        id: entry._id.toString(),
        songId,
        title: (entry.title as string | undefined) ?? songId,
        artist: entry.artist as string | undefined,
        album: entry.album as string | undefined,
        duration: entry.duration as number | undefined,
        preview: entry.preview as string | undefined,
        image: entry.image as string | undefined,
        notes: entry.notes as string | undefined,
        isCustom: entry.isCustom ?? false,
        bandId: entry.bandId?.toString(),
        bandName: entry.bandName as string | undefined,
        source: entry.bandId ? "band" : "personal",
        createdAt: entry.createdAt?.toISOString?.() ?? new Date().toISOString(),
      });
    }

    return NextResponse.json({ songs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile learnt songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnt songs" },
      { status: 500 },
    );
  }
}
