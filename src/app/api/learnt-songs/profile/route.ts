import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import { normaliseSongId } from "@/app/lib/serverUtils";
import { NextResponse } from "next/server";
import { ProfileLearntSong } from "@/app/types";
import { ObjectId } from "mongodb";

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

    const customSongIds = Array.from(
      new Set(
        learntEntries
          .filter((entry) => entry.isCustom)
          .map((entry) => normaliseSongId(entry.songId))
          .filter((songId) => ObjectId.isValid(songId)),
      ),
    );

    const customSongs = customSongIds.length
      ? await db
          .collection("custom_songs")
          .find(
            {
              _id: { $in: customSongIds.map((id) => new ObjectId(id)) },
            },
            {
              projection: {
                title: 1,
                album: 1,
                duration: 1,
                notes: 1,
                image: 1,
                hasAudio: 1,
                updatedAt: 1,
              },
            },
          )
          .toArray()
      : [];

    const customSongsById = new Map(
      customSongs.map((song) => [song._id.toString(), song]),
    );

    const seen = new Set<string>();
    const songs: ProfileLearntSong[] = [];

    for (const entry of learntEntries) {
      const songId = normaliseSongId(entry.songId);
      if (seen.has(songId)) continue;
      seen.add(songId);

      const isCustom = Boolean(entry.isCustom);
      const liveCustomSong = isCustom ? customSongsById.get(songId) : undefined;
      const updatedAtMs =
        liveCustomSong?.updatedAt instanceof Date
          ? liveCustomSong.updatedAt.getTime()
          : undefined;
      const customPreview =
        liveCustomSong?.hasAudio === true
          ? `/api/songs/${songId}/audio${updatedAtMs ? `?v=${updatedAtMs}` : ""}`
          : undefined;
      const resolvedDuration = isCustom
        ? liveCustomSong?.hasAudio === true
          ? (liveCustomSong?.duration as number | undefined)
          : undefined
        : (entry.duration as number | undefined);
      const resolvedPreview = isCustom
        ? customPreview
        : (entry.preview as string | undefined);

      songs.push({
        id: entry._id.toString(),
        songId,
        title:
          (liveCustomSong?.title as string | undefined) ??
          (entry.title as string | undefined) ??
          songId,
        artist: entry.artist as string | undefined,
        album:
          (liveCustomSong?.album as string | undefined) ??
          (entry.album as string | undefined),
        duration: resolvedDuration,
        preview: resolvedPreview,
        image:
          (liveCustomSong?.image as string | undefined) ??
          (entry.image as string | undefined),
        notes:
          (liveCustomSong?.notes as string | undefined) ??
          (entry.notes as string | undefined),
        isCustom,
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
