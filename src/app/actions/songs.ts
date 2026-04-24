"use server";

import { getAuthUser } from "@/app/lib/auth";
import {
  COLLECTIONS,
  requireBandMember,
  requireBandMemberContext,
} from "@/app/lib/serverData";
import { ObjectId } from "mongodb";

export async function createSongAction(
  bandId: string,
  title: string,
  notes: string = "",
  album: string = "",
) {
  try {
    if (!bandId || !title) {
      throw new Error("Band ID and title are required");
    }

    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    const newSong = {
      bandId: bandObjectId,
      creatorId: user._id,
      title,
      notes: notes || "",
      album: album || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection(COLLECTIONS.customSongs)
      .insertOne(newSong);

    return {
      success: true,
      song: {
        _id: result.insertedId.toString(),
        bandId: bandId,
        creatorId: user._id.toString(),
        title,
        notes: notes || "",
        album: album || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error creating song:", error);
    throw error instanceof Error ? error : new Error("Failed to create song");
  }
}

export async function deleteSongAction(songId: string) {
  try {
    const { db, user } = await getAuthUser();

    // Get the song
    const song = await db
      .collection(COLLECTIONS.customSongs)
      .findOne({ _id: new ObjectId(songId) });
    if (!song) {
      throw new Error("Song not found");
    }

    // verify user is a member of the band
    await requireBandMember(db, user._id.toString(), song.bandId);

    // felete the song
    await db
      .collection(COLLECTIONS.customSongs)
      .deleteOne({ _id: new ObjectId(songId) });

    return {
      success: true,
      message: "Song deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting song:", error);
    throw error instanceof Error ? error : new Error("Failed to delete song");
  }
}

export async function updateSongAction(
  songId: string,
  updates: { title?: string; notes?: string; album?: string },
) {
  try {
    const { db, user } = await getAuthUser();

    const song = await db
      .collection(COLLECTIONS.customSongs)
      .findOne({ _id: new ObjectId(songId) });
    if (!song) {
      throw new Error("Song not found");
    }

    // verify user is a member of the band
    await requireBandMember(db, user._id.toString(), song.bandId);

    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title !== undefined) setFields.title = updates.title;
    if (updates.notes !== undefined) setFields.notes = updates.notes;
    if (updates.album !== undefined) setFields.album = updates.album;

    await db
      .collection(COLLECTIONS.customSongs)
      .updateOne({ _id: new ObjectId(songId) }, { $set: setFields });

    return { success: true };
  } catch (error) {
    console.error("Error updating song:", error);
    throw error instanceof Error ? error : new Error("Failed to update song");
  }
}

export async function reorderAlbumSongsAction(
  bandId: string,
  album: string,
  songIds: string[],
) {
  try {
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const bulkOps = songIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id), bandId: bandObjectId },
        update: { $set: { order: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await db.collection(COLLECTIONS.customSongs).bulkWrite(bulkOps);
    }

    return { success: true };
  } catch (error) {
    console.error("Error reordering songs:", error);
    throw error instanceof Error ? error : new Error("Failed to reorder songs");
  }
}
