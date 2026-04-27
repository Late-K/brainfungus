"use server";

import { getAuthUser } from "@/app/lib/auth";
import {
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import { ObjectId } from "mongodb";

async function getSongMetadataForBand(
  db: Awaited<ReturnType<typeof getAuthUser>>["db"],
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
        preview:
          (customSong.audioUrl as string | undefined) ??
          (customSong.preview as string | undefined),
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

export async function toggleLearntSongAction(bandId: string, songId: string) {
  const { db, user, bandObjectId } = await requireBandMemberContext(bandId);
  const normalisedSongId = normaliseSongId(songId);

  const existingActive = await db.collection("learnt_songs").findOne({
    userId: user._id,
    songId: normalisedSongId,
    active: { $ne: false },
  });

  if (existingActive) {
    await db.collection("learnt_songs").deleteMany({
      userId: user._id,
      songId: normalisedSongId,
    });

    return { learnt: false };
  } else {
    const metadata = await getSongMetadataForBand(
      db,
      bandObjectId,
      normalisedSongId,
    );

    const existingInactive = await db.collection("learnt_songs").findOne({
      userId: user._id,
      songId: normalisedSongId,
      active: false,
    });

    if (existingInactive) {
      await db.collection("learnt_songs").updateMany(
        {
          userId: user._id,
          songId: normalisedSongId,
          active: false,
        },
        { $set: { active: true, ...metadata, updatedAt: new Date() } },
      );
    } else {
      await db.collection("learnt_songs").insertOne({
        userId: user._id,
        songId: normalisedSongId,
        active: true,
        ...metadata,
        createdAt: new Date(),
      });
    }

    return { learnt: true };
  }
}

export async function addPersonalLearntSongAction(song: {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  preview?: string;
  image?: string;
}) {
  const { db, user } = await getAuthUser();
  const songId = normaliseSongId(song.id);

  const metadata = {
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    preview: song.preview,
    image: song.image,
  };

  const activeLearnt = await db.collection("learnt_songs").findOne({
    userId: user._id,
    songId: songId,
    active: { $ne: false },
  });

  if (!activeLearnt) {
    const inactive = await db.collection("learnt_songs").findOne({
      userId: user._id,
      songId: songId,
      active: false,
    });

    if (inactive) {
      await db.collection("learnt_songs").updateMany(
        {
          userId: user._id,
          songId: songId,
          active: false,
        },
        { $set: { active: true, ...metadata, updatedAt: new Date() } },
      );
    } else {
      await db.collection("learnt_songs").insertOne({
        userId: user._id,
        songId,
        active: true,
        ...metadata,
        createdAt: new Date(),
      });
    }
  } else {
    // Update metadata on existing active entry in case it was previously missing
    await db
      .collection("learnt_songs")
      .updateOne(
        { userId: user._id, songId: songId, active: { $ne: false } },
        { $set: { ...metadata, updatedAt: new Date() } },
      );
  }

  return { added: true };
}

export async function removePersonalLearntSongAction(songId: string) {
  const { db, user } = await getAuthUser();

  const songIdStr = normaliseSongId(songId);

  await db.collection("learnt_songs").deleteMany({
    userId: user._id,
    songId: songIdStr,
  });

  return { removed: true };
}
