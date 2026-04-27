"use server";

import { getAuthUser } from "@/app/lib/auth";
import {
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
