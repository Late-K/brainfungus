"use server";

import { getAuthUser } from "@/app/lib/auth";
import { ObjectId } from "mongodb";
import { DeezerResult } from "@/app/types";

async function assertBandMember(bandId: string) {
  const { db, user } = await getAuthUser();
  const bandObjectId = new ObjectId(bandId);
  const band = await db.collection("bands").findOne({ _id: bandObjectId });

  if (!band) {
    throw new Error("Band not found");
  }

  if (!band.memberIds.includes(user._id.toString())) {
    throw new Error("Not a member of this band");
  }

  return { db, user, bandObjectId };
}

export async function addBandCoverAction(bandId: string, song: DeezerResult) {
  if (!bandId || !song?.id || !song?.title) {
    throw new Error("Band ID and song are required");
  }

  const { db, user, bandObjectId } = await assertBandMember(bandId);

  const existing = await db.collection("covers").findOne({
    bandId: bandObjectId,
    songId: song.id.toString(),
  });

  if (existing) {
    return {
      success: true,
      alreadyExists: true,
      cover: {
        _id: existing._id.toString(),
        songId: existing.songId,
      },
    };
  }

  const now = new Date();
  const result = await db.collection("covers").insertOne({
    bandId: bandObjectId,
    creatorId: user._id,
    songId: song.id.toString(),
    title: song.title,
    artist: song.artist || "",
    album: song.album || "",
    duration: typeof song.duration === "number" ? song.duration : 0,
    preview: song.preview || "",
    image: song.image || "",
    createdAt: now,
    updatedAt: now,
  });

  return {
    success: true,
    alreadyExists: false,
    cover: {
      _id: result.insertedId.toString(),
      songId: song.id.toString(),
    },
  };
}

export async function removeBandCoverAction(bandId: string, songId: string) {
  if (!bandId || !songId) {
    throw new Error("Band ID and song ID are required");
  }

  const { db, bandObjectId } = await assertBandMember(bandId);

  await db.collection("covers").deleteOne({
    bandId: bandObjectId,
    songId,
  });

  return { success: true };
}
