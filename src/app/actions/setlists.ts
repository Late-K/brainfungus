"use server";

import { getAuthUser } from "@/app/lib/auth";
import {
  normaliseSongId,
  requireBandMember,
  requireBandMemberContext,
} from "@/app/lib/serverUtils";
import { ObjectId } from "mongodb";
import { Song } from "@/app/types";
import { toSetlistSong } from "@/app/lib/setlistUtils";

export async function createSetlistAction(
  bandId: string,
  name: string,
  songs: Song[],
) {
  try {
    if (!bandId || !name) {
      throw new Error("Band ID and name are required");
    }

    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    // deactivate any currently active setlist for this band
    await db
      .collection("setlists")
      .updateMany(
        { bandId: bandObjectId, isActive: true },
        { $set: { isActive: false, updatedAt: new Date() } },
      );

    const newSetlist = {
      bandId: bandObjectId,
      creatorId: user._id,
      name,
      songs: songs.map(toSetlistSong),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("setlists").insertOne(newSetlist);

    return {
      success: true,
      setlistId: result.insertedId.toString(),
      message: "Setlist created successfully",
    };
  } catch (error) {
    console.error("Error creating setlist:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to create setlist");
  }
}

export async function deleteSetlistAction(setlistId: string) {
  try {
    if (!ObjectId.isValid(setlistId)) throw new Error("Invalid setlist ID");
    const { db, user } = await getAuthUser();

    const setlist = await db
      .collection("setlists")
      .findOne({ _id: new ObjectId(setlistId) });
    if (!setlist) {
      throw new Error("Setlist not found");
    }

    if (setlist.creatorId.toString() !== user._id.toString()) {
      throw new Error("Not authorized to delete this setlist");
    }

    await db.collection("setlists").deleteOne({ _id: new ObjectId(setlistId) });

    return {
      success: true,
      message: "Setlist deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting setlist:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to delete setlist");
  }
}

export async function setActiveSetlistAction(
  bandId: string,
  setlistId: string,
) {
  try {
    if (!ObjectId.isValid(setlistId)) throw new Error("Invalid setlist ID");
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    // deactivate all other setlists in this band
    await db
      .collection("setlists")
      .updateMany({ bandId: bandObjectId }, { $set: { isActive: false } });

    // activate the selected setlist
    const result = await db
      .collection("setlists")
      .updateOne(
        { _id: new ObjectId(setlistId), bandId: bandObjectId },
        { $set: { isActive: true, updatedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      throw new Error("Setlist not found");
    }

    return {
      success: true,
      message: "Setlist activated successfully",
    };
  } catch (error) {
    console.error("Error setting active setlist:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to set active setlist");
  }
}

export async function updateSetlistAction(
  setlistId: string,
  name: string,
  songs: Song[],
) {
  try {
    if (!ObjectId.isValid(setlistId)) throw new Error("Invalid setlist ID");
    const { db, user } = await getAuthUser();

    if (!name.trim()) {
      throw new Error("Setlist name is required");
    }

    const setlist = await db
      .collection("setlists")
      .findOne({ _id: new ObjectId(setlistId) });
    if (!setlist) throw new Error("Setlist not found");

    await requireBandMember(db, user._id.toString(), setlist.bandId);

    await db.collection("setlists").updateOne(
      { _id: new ObjectId(setlistId) },
      {
        $set: {
          name: name.trim(),
          songs: songs.map(toSetlistSong),
          updatedAt: new Date(),
        },
      },
    );

    return { success: true, message: "Setlist updated" };
  } catch (error) {
    console.error("Error updating setlist:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to update setlist");
  }
}

export async function deactivateSetlistAction(
  bandId: string,
  setlistId: string,
) {
  try {
    if (!ObjectId.isValid(setlistId)) throw new Error("Invalid setlist ID");
    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const result = await db
      .collection("setlists")
      .updateOne(
        { _id: new ObjectId(setlistId), bandId: bandObjectId },
        { $set: { isActive: false, updatedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      throw new Error("Setlist not found");
    }

    return { success: true, message: "Setlist deactivated" };
  } catch (error) {
    console.error("Error deactivating setlist:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to deactivate setlist");
  }
}

// add a single song to the band's active setlist (used from covers and custom songs lists)
export async function addSongToActiveSetlistAction(bandId: string, song: Song) {
  try {
    if (!bandId || !song?.id) {
      throw new Error("Band ID and song are required");
    }

    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const setlist = await db
      .collection("setlists")
      .findOne({ bandId: bandObjectId, isActive: true });
    if (!setlist) throw new Error("No active setlist");

    const songId = normaliseSongId(song.id);

    // custom songs must belong to this band
    if (song.isCustom) {
      if (!ObjectId.isValid(songId)) throw new Error("Song not found");
      const customSong = await db
        .collection("custom_songs")
        .findOne({ _id: new ObjectId(songId), bandId: bandObjectId });
      if (!customSong) throw new Error("Song not found");
    }

    const existingSongs: Array<{ id: unknown }> = setlist.songs || [];
    if (existingSongs.some((s) => normaliseSongId(s.id) === songId)) {
      return {
        success: true,
        alreadyExists: true,
        setlistId: setlist._id.toString(),
      };
    }

    await db.collection("setlists").updateOne({ _id: setlist._id }, {
      $push: { songs: toSetlistSong({ ...song, id: songId }) },
      $set: { updatedAt: new Date() },
    } as Record<string, unknown>);

    return {
      success: true,
      alreadyExists: false,
      setlistId: setlist._id.toString(),
    };
  } catch (error) {
    console.error("Error adding song to active setlist:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to add song to setlist");
  }
}

export async function removeSongFromActiveSetlistAction(
  bandId: string,
  songId: string,
) {
  try {
    if (!bandId || !songId) {
      throw new Error("Band ID and song ID are required");
    }

    const { db, bandObjectId } = await requireBandMemberContext(bandId);

    const result = await db
      .collection("setlists")
      .updateOne({ bandId: bandObjectId, isActive: true }, {
        $pull: { songs: { id: normaliseSongId(songId) } },
        $set: { updatedAt: new Date() },
      } as Record<string, unknown>);

    if (result.matchedCount === 0) throw new Error("No active setlist");

    return { success: true };
  } catch (error) {
    console.error("Error removing song from active setlist:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to remove song from setlist");
  }
}
