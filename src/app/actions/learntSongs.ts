"use server";

import { getAuthUser } from "@/app/lib/auth";
import { ObjectId } from "mongodb";

export async function toggleLearntSongAction(bandId: string, songId: string) {
  const { db, user } = await getAuthUser();
  const bandObjectId = new ObjectId(bandId);

  const band = await db.collection("bands").findOne({ _id: bandObjectId });
  if (!band || !band.memberIds.includes(user._id.toString())) {
    throw new Error("Not a member of this band");
  }

  const existingActive = await db.collection("learnt_songs").findOne({
    bandId: bandObjectId,
    userId: user._id,
    songId,
    active: { $ne: false },
  });

  if (existingActive) {
    await db.collection("learnt_songs").deleteOne({ _id: existingActive._id });
    return { learnt: false };
  } else {
    const existingInactive = await db.collection("learnt_songs").findOne({
      bandId: bandObjectId,
      userId: user._id,
      songId,
      active: false,
    });

    if (existingInactive) {
      await db
        .collection("learnt_songs")
        .updateOne(
          { _id: existingInactive._id },
          { $set: { active: true, updatedAt: new Date() } },
        );
    } else {
      await db.collection("learnt_songs").insertOne({
        bandId: bandObjectId,
        userId: user._id,
        songId,
        active: true,
        createdAt: new Date(),
      });
    }

    return { learnt: true };
  }
}
