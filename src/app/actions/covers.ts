"use server";

import {
  normaliseSongId,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import { DeezerResult } from "@/app/types";

export async function addBandCoverAction(bandId: string, song: DeezerResult) {
  try {
    if (!bandId || !song?.id || !song?.title) {
      throw new Error("Band ID and song are required");
    }

    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);
    const songId = normaliseSongId(song.id);

    const existing = await db.collection("covers").findOne({
      bandId: bandObjectId,
      songId: songId,
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
      songId,
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
        songId,
      },
    };
  } catch (error) {
    console.error("addBandCoverAction error:", error);
    throw error;
  }
}

export async function removeBandCoverAction(bandId: string, songId: string) {
  try {
    if (!bandId || !songId) {
      throw new Error("Band ID and song ID are required");
    }

    const { db, bandObjectId } = await requireBandMemberContext(bandId);
    const normalisedSongId = normaliseSongId(songId);

    await db.collection("covers").deleteOne({
      bandId: bandObjectId,
      songId: normalisedSongId,
    });

    return { success: true };
  } catch (error) {
    console.error("removeBandCoverAction error:", error);
    throw error;
  }
}
