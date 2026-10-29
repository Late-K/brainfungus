"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import {
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/server/utils";
import { Db, ObjectId } from "mongodb";
import { runAction, UserError } from "@/app/lib/actionResult";
import { readOneOf, readSongInput, readString } from "@/app/lib/validate";
import { getSongBands } from "@/app/lib/server/customSongAccess";

async function getSongMetadataForBand(
  db: Db,
  bandObjectId: ObjectId,
  songId: string,
) {
  // custom song covers only store the song's id, so they're looked up below
  const cover = await db.collection("covers").findOne({
    bandId: bandObjectId,
    songId: songId,
    isCustom: { $ne: true },
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

  // the band's own custom songs, or another band's that's in its setlists.
  // either way the song is saved with the band it belongs to
  if (ObjectId.isValid(songId)) {
    const customSong = await db
      .collection("custom_songs")
      .findOne({ _id: new ObjectId(songId) });
    const songBandId = customSong?.bandId as ObjectId | undefined;
    const songBand = songBandId
      ? (await getSongBands(db, [songBandId])).get(songBandId.toString())
      : undefined;

    if (
      customSong &&
      songBandId &&
      songBand &&
      (songBandId.equals(bandObjectId) || !songBand.isPrivate)
    ) {
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
        bandId: songBandId,
        bandName: songBand.name,
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

// a song is either learnt or still being learnt, never both, so marking it as
// one takes it off the other list

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
  await db.collection("learning_songs").deleteMany({ userId, songId });
}

async function markLearning(
  db: Db,
  userId: ObjectId,
  songId: string,
  metadata: Record<string, unknown>,
) {
  await db
    .collection("learning_songs")
    .updateOne(
      { userId, songId },
      {
        $set: { ...metadata, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  await db.collection("learnt_songs").deleteMany({ userId, songId });
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

// the learning version of toggleLearntSongAction. marking a learnt song as
// learning moves it back, for songs the user has forgotten
export async function toggleLearningSongAction(bandId: string, songId: string) {
  return runAction("Failed to update learning status", async () => {
    const id = readString(songId, "song", 100);
    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    const existing = await db.collection("learning_songs").findOne({
      userId: user._id,
      songId: id,
    });

    if (existing) {
      await db
        .collection("learning_songs")
        .deleteMany({ userId: user._id, songId: id });
      return { learning: false };
    }

    const metadata = await getSongMetadataForBand(db, bandObjectId, id);
    await markLearning(db, user._id, id, metadata);
    return { learning: true };
  });
}

type PersonalSong = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  preview?: string;
  image?: string;
};

function personalSongMetadata(song: PersonalSong) {
  const input = readSongInput(song);
  return {
    songId: input.id,
    metadata: {
      title: input.title,
      artist: input.artist,
      album: input.album,
      duration: input.duration,
      preview: input.preview,
      image: input.image,
    },
  };
}

// add a song to the user's own learnt list, from search or someone else's profile
export async function addPersonalLearntSongAction(song: PersonalSong) {
  return runAction("Failed to add song", async () => {
    const { songId, metadata } = personalSongMetadata(song);
    const { db, user } = await getAuthUser();

    await markLearnt(db, user._id, songId, metadata);
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

// add a song to the user's own learning list, from search or someone else's profile
export async function addPersonalLearningSongAction(song: PersonalSong) {
  return runAction("Failed to add song", async () => {
    const { songId, metadata } = personalSongMetadata(song);
    const { db, user } = await getAuthUser();

    await markLearning(db, user._id, songId, metadata);
  });
}

export async function removePersonalLearningSongAction(songId: string) {
  return runAction("Failed to remove song", async () => {
    const id = readString(songId, "song", 100);
    const { db, user } = await getAuthUser();

    await db
      .collection("learning_songs")
      .deleteMany({ userId: user._id, songId: id });
  });
}

// everything getSongMetadataForBand and personalSongMetadata can save
const song_metadata_fields = [
  "title",
  "artist",
  "album",
  "duration",
  "preview",
  "image",
  "notes",
  "isCustom",
  "bandId",
  "bandName",
];

// move one of the user's songs between learnt and learning, keeping what it
// was saved with, e.g. which band a custom song came from
export async function moveSongAction(
  songId: string,
  to: "learnt" | "learning",
) {
  return runAction("Failed to move song", async () => {
    const id = readString(songId, "song", 100);
    const target = readOneOf(to, ["learnt", "learning"] as const, "list");
    const { db, user } = await getAuthUser();

    const entry = await db
      .collection(target === "learnt" ? "learning_songs" : "learnt_songs")
      .findOne({ userId: user._id, songId: id });
    if (!entry) throw new UserError("Song not found");

    const metadata = Object.fromEntries(
      song_metadata_fields
        .filter((field) => entry[field] !== undefined)
        .map((field) => [field, entry[field]]),
    );

    if (target === "learnt") {
      await markLearnt(db, user._id, id, metadata);
    } else {
      await markLearning(db, user._id, id, metadata);
    }
  });
}
