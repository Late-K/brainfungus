"use server";

import { getAuthUser } from "@/app/lib/auth";
import {
  COLLECTIONS,
  getSongIdFilter,
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/serverData";
import { ObjectId } from "mongodb";

async function getSongMetadataForBand(
  db: Awaited<ReturnType<typeof getAuthUser>>["db"],
  bandObjectId: ObjectId,
  songId: string,
) {
  const cover = await db.collection(COLLECTIONS.covers).findOne({
    bandId: bandObjectId,
    songId: getSongIdFilter(songId),
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
      .collection(COLLECTIONS.customSongs)
      .findOne({ _id: new ObjectId(songId), bandId: bandObjectId });

    if (customSong) {
      return {
        title: customSong.title,
        album: customSong.album,
        duration: customSong.duration,
        preview: customSong.preview,
        image: customSong.image,
      };
    }
  }

  const setlistWithSong = await db.collection(COLLECTIONS.setlists).findOne(
    {
      bandId: bandObjectId,
      "songs.id": getSongIdFilter(songId),
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

  const existingActive = await db.collection(COLLECTIONS.learntSongs).findOne({
    userId: user._id,
    songId: getSongIdFilter(normalisedSongId),
    active: { $ne: false },
  });

  if (existingActive) {
    await db.collection(COLLECTIONS.learntSongs).deleteMany({
      userId: user._id,
      songId: getSongIdFilter(normalisedSongId),
    });

    await db.collection(COLLECTIONS.personalLearntSongs).deleteOne({
      userId: user._id,
      songId: getSongIdFilter(normalisedSongId),
    });

    return { learnt: false };
  } else {
    const existingInactive = await db
      .collection(COLLECTIONS.learntSongs)
      .findOne({
        userId: user._id,
        songId: getSongIdFilter(normalisedSongId),
        active: false,
      });

    if (existingInactive) {
      await db.collection(COLLECTIONS.learntSongs).updateMany(
        {
          userId: user._id,
          songId: getSongIdFilter(normalisedSongId),
          active: false,
        },
        { $set: { active: true, updatedAt: new Date() } },
      );
    } else {
      await db.collection(COLLECTIONS.learntSongs).insertOne({
        userId: user._id,
        songId: normalisedSongId,
        active: true,
        createdAt: new Date(),
      });
    }

    const personalEntry = await db
      .collection(COLLECTIONS.personalLearntSongs)
      .findOne({ userId: user._id, songId: getSongIdFilter(normalisedSongId) });

    if (!personalEntry) {
      const metadata = await getSongMetadataForBand(
        db,
        bandObjectId,
        normalisedSongId,
      );

      await db.collection(COLLECTIONS.personalLearntSongs).insertOne({
        userId: user._id,
        songId: normalisedSongId,
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

  const existing = await db
    .collection(COLLECTIONS.personalLearntSongs)
    .findOne({
      userId: user._id,
      songId: getSongIdFilter(songId),
    });

  if (!existing) {
    await db.collection(COLLECTIONS.personalLearntSongs).insertOne({
      userId: user._id,
      songId,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      preview: song.preview,
      image: song.image,
      createdAt: new Date(),
    });
  }

  const activeLearnt = await db.collection(COLLECTIONS.learntSongs).findOne({
    userId: user._id,
    songId: getSongIdFilter(songId),
    active: { $ne: false },
  });

  if (!activeLearnt) {
    const inactive = await db.collection(COLLECTIONS.learntSongs).findOne({
      userId: user._id,
      songId: getSongIdFilter(songId),
      active: false,
    });

    if (inactive) {
      await db.collection(COLLECTIONS.learntSongs).updateMany(
        {
          userId: user._id,
          songId: getSongIdFilter(songId),
          active: false,
        },
        { $set: { active: true, updatedAt: new Date() } },
      );
    } else {
      await db.collection(COLLECTIONS.learntSongs).insertOne({
        userId: user._id,
        songId,
        active: true,
        createdAt: new Date(),
      });
    }
  }

  return { added: true };
}

export async function removePersonalLearntSongAction(songId: string) {
  const { db, user } = await getAuthUser();

  const songIdStr = normaliseSongId(songId);

  // Remove from personal list
  await db.collection(COLLECTIONS.personalLearntSongs).deleteOne({
    userId: user._id,
    songId: getSongIdFilter(songIdStr),
  });

  // Remove from all bands
  await db.collection(COLLECTIONS.learntSongs).deleteMany({
    userId: user._id,
    songId: getSongIdFilter(songIdStr),
  });

  return { removed: true };
}
