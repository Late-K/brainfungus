import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import {
  COLLECTIONS,
  getSongIdCandidates,
  normaliseSongId,
} from "@/app/lib/serverData";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ProfileLearntSong } from "@/app/types";

// GET - fetch all learnt songs for the current user (global + personal metadata)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    const currentUser = await db
      .collection(COLLECTIONS.users)
      .findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const mergedBySongId = new Map<string, ProfileLearntSong>();

    // --- Personal learnt songs ---
    const personalSongs = await db
      .collection(COLLECTIONS.personalLearntSongs)
      .find({ userId: currentUser._id })
      .sort({ createdAt: -1 })
      .toArray();

    // --- Global learnt songs ---
    const learntEntries = await db
      .collection(COLLECTIONS.learntSongs)
      .find({ userId: currentUser._id, active: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    const allSongIds = [
      ...new Set(
        [
          ...personalSongs.map((song) => normaliseSongId(song.songId)),
          ...learntEntries.map((entry) => normaliseSongId(entry.songId)),
        ].filter(Boolean),
      ),
    ];

    const allSongIdCandidates = [
      ...new Set(allSongIds.flatMap((songId) => getSongIdCandidates(songId))),
    ];

    const covers =
      allSongIdCandidates.length > 0
        ? await db
            .collection(COLLECTIONS.covers)
            .find({ songId: { $in: allSongIdCandidates } })
            .toArray()
        : [];

    const setlists =
      allSongIdCandidates.length > 0
        ? await db
            .collection(COLLECTIONS.setlists)
            .find(
              { "songs.id": { $in: allSongIdCandidates } },
              { projection: { _id: 1, bandId: 1, songs: 1 } },
            )
            .toArray()
        : [];

    const coverBySongId = new Map(
      covers.map((cover) => [cover.songId?.toString(), cover]),
    );
    const setlistSongBySongId = new Map<string, Record<string, unknown>>();

    for (const setlist of setlists) {
      for (const song of (setlist.songs || []) as Array<
        Record<string, unknown>
      >) {
        const songId = normaliseSongId(song.id);

        if (!setlistSongBySongId.has(songId)) {
          setlistSongBySongId.set(songId, song);
        }
      }
    }

    const customSongIds = [
      ...new Set(allSongIds.filter((songId) => ObjectId.isValid(songId))),
    ];
    const customSongs =
      customSongIds.length > 0
        ? await db
            .collection(COLLECTIONS.customSongs)
            .find({
              _id: { $in: customSongIds.map((songId) => new ObjectId(songId)) },
            })
            .toArray()
        : [];
    const customSongMap = new Map(
      customSongs.map((song) => [song._id.toString(), song]),
    );
    const customSongBandIds = [
      ...new Set(
        customSongs
          .map((song) => song.bandId?.toString())
          .filter((bandId): bandId is string => Boolean(bandId)),
      ),
    ];
    const customSongBands =
      customSongBandIds.length > 0
        ? await db
            .collection(COLLECTIONS.bands)
            .find({
              _id: {
                $in: customSongBandIds
                  .filter((bandId) => ObjectId.isValid(bandId))
                  .map((bandId) => new ObjectId(bandId)),
              },
            })
            .toArray()
        : [];
    const bandMap = new Map(
      customSongBands.map((band) => [band._id.toString(), band.name as string]),
    );

    for (const s of personalSongs) {
      const songId = normaliseSongId(s.songId);
      const cover = coverBySongId.get(songId);
      const setlistSong = setlistSongBySongId.get(songId);
      const title =
        typeof s.title === "string" &&
        s.title.trim().length > 0 &&
        s.title !== songId
          ? s.title
          : (cover?.title as string | undefined) ||
            (setlistSong?.title as string | undefined) ||
            songId;
      const artist =
        s.artist ||
        (cover?.artist as string | undefined) ||
        (setlistSong?.artist as string | undefined);
      const album =
        s.album ||
        (cover?.album as string | undefined) ||
        (setlistSong?.album as string | undefined);
      const duration =
        s.duration ||
        (cover?.duration as number | undefined) ||
        (setlistSong?.duration as number | undefined);
      const image =
        s.image ||
        (cover?.image as string | undefined) ||
        (setlistSong?.image as string | undefined);

      mergedBySongId.set(songId, {
        id: s._id.toString(),
        songId,
        title,
        artist,
        album,
        duration,
        image,
        isCustom: false,
        source: "personal",
        createdAt: s.createdAt?.toISOString?.() ?? new Date().toISOString(),
      });
    }

    if (learntEntries.length > 0) {
      for (const entry of learntEntries) {
        const songId = normaliseSongId(entry.songId);

        // Resolve metadata by songId so learnt state is shared across all bands.
        let title = songId;
        let artist: string | undefined;
        let album: string | undefined;
        let duration: number | undefined;
        let image: string | undefined;
        let isCustom = false;
        let bandId: string | undefined;
        let bandName: string | undefined;

        const cover = coverBySongId.get(songId);
        const setlistSong = setlistSongBySongId.get(songId);

        if (cover) {
          title = cover.title;
          artist = cover.artist;
          album = cover.album;
          duration = cover.duration;
          image = cover.image;
          isCustom = false;
        } else if (setlistSong) {
          title = (setlistSong.title as string | undefined) || songId;
          artist = setlistSong.artist as string | undefined;
          album = setlistSong.album as string | undefined;
          duration = setlistSong.duration as number | undefined;
          image = setlistSong.image as string | undefined;
          isCustom = Boolean(setlistSong.isCustom);
        } else if (ObjectId.isValid(songId)) {
          const customSong = customSongMap.get(songId);

          if (customSong) {
            title = customSong.title;
            album = customSong.album;
            isCustom = true;
            bandId = customSong.bandId?.toString();
            bandName = bandId ? bandMap.get(bandId) : undefined;
          }
        }

        const existing = mergedBySongId.get(songId);

        // Keep personal entries as canonical rows; otherwise fill from global learnt.
        if (!existing) {
          mergedBySongId.set(songId, {
            id: entry._id.toString(),
            songId,
            title,
            artist,
            album,
            duration,
            image,
            isCustom,
            bandId,
            bandName,
            source: "band",
            createdAt:
              entry.createdAt?.toISOString?.() ?? new Date().toISOString(),
          });
          continue;
        }

        if (existing.source === "personal") {
          mergedBySongId.set(songId, {
            ...existing,
            title:
              (existing.title && existing.title !== songId
                ? existing.title
                : title) || songId,
            artist: existing.artist || artist,
            album: existing.album || album,
            duration: existing.duration || duration,
            image: existing.image || image,
            isCustom: existing.isCustom || isCustom,
            bandId: existing.bandId || bandId,
            bandName: existing.bandName || bandName,
          });
        }
      }
    }

    const dedupedSongs = [...mergedBySongId.values()].sort((a, b) => {
      if (a.source === "personal" && b.source !== "personal") return -1;
      if (b.source === "personal" && a.source !== "personal") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ songs: dedupedSongs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile learnt songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnt songs" },
      { status: 500 },
    );
  }
}
