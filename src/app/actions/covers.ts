"use server";

import { requireBandMemberContext } from "@/app/lib/server/utils";
import { runAction, UserError } from "@/app/lib/actionResult";
import { readSongInput, readString } from "@/app/lib/validate";
import { DeezerResult } from "@/app/types";

export async function addBandCoverAction(bandId: string, song: DeezerResult) {
  return runAction("Failed to add cover", async () => {
    const input = readSongInput(song);
    if (!input.title) throw new UserError("Song title is required");

    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    const existing = await db.collection("covers").findOne({
      bandId: bandObjectId,
      songId: input.id,
    });

    if (existing) {
      return {
        alreadyExists: true,
        cover: { _id: existing._id.toString(), songId: input.id },
      };
    }

    const now = new Date();
    const result = await db.collection("covers").insertOne({
      bandId: bandObjectId,
      creatorId: user._id,
      songId: input.id,
      title: input.title,
      artist: input.artist ?? "",
      album: input.album ?? "",
      duration: input.duration,
      preview: input.preview ?? "",
      image: input.image ?? "",
      createdAt: now,
      updatedAt: now,
    });

    return {
      alreadyExists: false,
      cover: { _id: result.insertedId.toString(), songId: input.id },
    };
  });
}

export async function removeBandCoverAction(bandId: string, songId: string) {
  return runAction("Failed to remove cover", async () => {
    const id = readString(songId, "song", 100);
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    await db.collection("covers").deleteOne({
      bandId: bandObjectId,
      songId: id,
    });
  });
}
