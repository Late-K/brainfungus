"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import {
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/server/utils";
import { Db, ObjectId } from "mongodb";
import { runAction } from "@/app/lib/actionResult";
import { readSongInput, readString } from "@/app/lib/validate";

async function getSongMetadataForBand(
  db: Db,
  bandObjectId: ObjectId,
  songId: string,
) {
  const cover = await db.collection("covers").findOne({
    bandId: bandObjectId,
    songId: songId,
  });

  if (cover) {
    return {
      title: cover.title,
      artist: cover.artist,
      album: cover.album,
      duration: cover.duration,
      preview: cover.preview,
      image: cover.image,
    };
  }

  if (ObjectId.isValid(songId)) {
    const customSong = await db
      .collection("custom_songs")
      .findOne({ _id: new ObjectId(songId), bandId: bandObjectId });

    if (customSong) {
      const band = await db
        .collection("bands")
        .findOne({ _id: bandObjectId }, { projection: { name: 1 } });
      return {
        title: customSong.title,
        album: customSong.album,
        duration: customSong.duration,
        preview: customSong.hasAudio
          ? `/api/songs/${songId}/audio`
          : ((customSong.audioUrl as string | undefined) ??
            (customSong.preview as string | undefined)),
        image: customSong.image,
        notes: customSong.notes as string | undefined,
        isCustom: true,
        bandId: bandObjectId,
        bandName: band?.name as string | undefined,
      };
    }
  }

  const setlistWithSong = await db.collection("setlists").findOne(
    {
      bandId: bandObjectId,
      "songs.id": songId,
    },
    { projection: { songs: 1 } },
  );

  if (setlistWithSong?.songs?.length) {
    const song = setlistWithSong.songs.find(
      (entry: { id?: unknown }) => normaliseSongId(entry.id) === songId,
    );

    if (song) {
      return {
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        preview: song.preview,
        image: song.image,
      };
    }
  }

  return {
    title: songId,
  };
}

// marks a song learnt for a user, reusing any entry left inactive when they
// left a band
async function markLearnt(
  db: Db,
  userId: ObjectId,
  songId: string,
  metadata: Record<string, unknown>,
) {
  const result = await db
    .collection("learnt_songs")
    .updateMany(
      { userId, songId },
      { $set: { active: true, ...metadata, updatedAt: new Date() } },
    );
  if (result.matchedCount === 0) {
    await db.collection("learnt_songs").insertOne({
      userId,
      songId,
      active: true,
      ...metadata,
      createdAt: new Date(),
    });
  }
}

export async function toggleLearntSongAction(bandId: string, songId: string) {
  return runAction("Failed to update learnt status", async () => {
    const id = readString(songId, "song", 100);
    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    const existingActive = await db.collection("learnt_songs").findOne({
      userId: user._id,
      songId: id,
      active: { $ne: false },
    });

    if (existingActive) {
      await db
        .collection("learnt_songs")
        .deleteMany({ userId: user._id, songId: id });
      return { learnt: false };
    }

    const metadata = await getSongMetadataForBand(db, bandObjectId, id);
    await markLearnt(db, user._id, id, metadata);
    return { learnt: true };
  });
}

// add a song to the user's own learnt list, from search or someone else's profile
export async function addPersonalLearntSongAction(song: {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  preview?: string;
  image?: string;
}) {
  return runAction("Failed to add song", async () => {
    const input = readSongInput(song);
    const { db, user } = await getAuthUser();

    await markLearnt(db, user._id, input.id, {
      title: input.title,
      artist: input.artist,
      album: input.album,
      duration: input.duration,
      preview: input.preview,
      image: input.image,
    });
  });
}

export async function removePersonalLearntSongAction(songId: string) {
  return runAction("Failed to remove song", async () => {
    const id = readString(songId, "song", 100);
    const { db, user } = await getAuthUser();

    await db
      .collection("learnt_songs")
      .deleteMany({ userId: user._id, songId: id });
  });
}
