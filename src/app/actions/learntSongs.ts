"use server";

import { getAuthUser } from "@/app/lib/auth";
import { ObjectId } from "mongodb";

export async function toggleLearntSongAction(bandId: string, songId: string) {
  const { db, user } = await getAuthUser();

  const band = await db
    .collection("bands")
    .findOne({ _id: new ObjectId(bandId) });
  if (!band || !band.memberIds.includes(user._id.toString())) {
    throw new Error("Not a member of this band");
  }

  const existing = await db.collection("learnt_songs").findOne({
    bandId: new ObjectId(bandId),
    userId: user._id,
    songId,
  });

  if (existing) {
    await db.collection("learnt_songs").deleteOne({ _id: existing._id });
    return { learnt: false };
  } else {
    await db.collection("learnt_songs").insertOne({
      bandId: new ObjectId(bandId),
      userId: user._id,
      songId,
      createdAt: new Date(),
    });
    return { learnt: true };
  }
}
