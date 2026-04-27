"use server";

import { getAuthUser } from "@/app/lib/auth";
import { requireBandMemberContext } from "@/app/lib/serverUtils";
import { ObjectId, Db } from "mongodb";

type BandRole = "creator" | "admin" | "member";
type BandMemberEntry = { userId: string; role: BandRole };

type BandDocument = {
  _id?: ObjectId;
  name: string;
  description: string;
  members: BandMemberEntry[];
  createdAt: Date;
};

function getBandsCollection(db: Db) {
  return db.collection<BandDocument>("bands");
}

function isMember(band: BandDocument, userId: string) {
  return band.members.some((m) => m.userId === userId);
}

function isAdminOrCreator(band: BandDocument, userId: string) {
  return band.members.some(
    (m) => m.userId === userId && (m.role === "admin" || m.role === "creator"),
  );
}

function isBandCreator(band: BandDocument, userId: string) {
  return band.members.some((m) => m.userId === userId && m.role === "creator");
}

function getMemberEntry(band: BandDocument, userId: string) {
  return band.members.find((m) => m.userId === userId);
}

async function setMemberBandDataActiveState(
  db: Db,
  bandId: string,
  memberId: string,
  active: boolean,
) {
  if (!ObjectId.isValid(memberId)) return;

  const bandObjectId = new ObjectId(bandId);
  const memberObjectId = new ObjectId(memberId);

  const rehearsalIds = (
    await db
      .collection("rehearsals")
      .find({ bandId: bandObjectId })
      .project({ _id: 1 })
      .toArray()
  ).map((r) => r._id);

  if (rehearsalIds.length === 0) return;

  await db
    .collection("rehearsal_availability")
    .updateMany(
      { rehearsalId: { $in: rehearsalIds }, userId: memberObjectId },
      { $set: { active, updatedAt: new Date() } },
    );
}

// delete a band and all its related data
async function deleteBandCascade(db: Db, bandId: string) {
  const oid = new ObjectId(bandId);
  const rehearsalIds = (
    await db
      .collection("rehearsals")
      .find({ bandId: oid })
      .project({ _id: 1 })
      .toArray()
  ).map((rehearsal) => rehearsal._id);

  await getBandsCollection(db).deleteOne({ _id: oid });
  await db.collection("band_messages").deleteMany({ bandId: oid });
  await db.collection("setlists").deleteMany({ bandId: oid });
  await db.collection("custom_songs").deleteMany({ bandId: oid });
  await db.collection("covers").deleteMany({ bandId: oid });
  await db.collection("learnt_songs").deleteMany({ bandId: oid });
  await db.collection("rehearsals").deleteMany({ bandId: oid });

  if (rehearsalIds.length > 0) {
    await db.collection("rehearsal_availability").deleteMany({
      rehearsalId: { $in: rehearsalIds },
    });
  }
}

export async function createBandAction(
  name: string,
  description: string,
  memberIds: string[],
) {
  try {
    const { db, user } = await getAuthUser();

    if (!name) {
      throw new Error("Band name is required");
    }

    const creatorId = user._id.toString();
    const validatedMemberIds = memberIds.filter(
      (id) => typeof id === "string" && ObjectId.isValid(id),
    );
    const allMemberIds = Array.from(
      new Set([creatorId, ...validatedMemberIds]),
    );

    const members: BandMemberEntry[] = allMemberIds.map((id) => ({
      userId: id,
      role: id === creatorId ? "creator" : "member",
    }));

    const newBand = {
      name,
      description: description || "",
      members,
      createdAt: new Date(),
    };

    const result = await getBandsCollection(db).insertOne(newBand);

    return {
      success: true,
      bandId: result.insertedId.toString(),
      message: "Band created successfully",
    };
  } catch (error) {
    console.error("Error creating band:", error);
    throw error instanceof Error ? error : new Error("Failed to create band");
  }
}

export async function sendChatMessageAction(bandId: string, message: string) {
  try {
    if (!message || typeof message !== "string" || !message.trim()) {
      throw new Error("Message is required");
    }
    if (message.trim().length > 2000) {
      throw new Error("Message is too long (max 2000 characters)");
    }

    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);

    // insert message — store only userId, resolve user details at read time
    const newMessage = {
      bandId: bandObjectId,
      userId: user._id,
      message: message.trim(),
      createdAt: new Date(),
    };

    const result = await db.collection("band_messages").insertOne(newMessage);

    return {
      success: true,
      message: {
        _id: result.insertedId.toString(),
        bandId: bandId,
        userId: user._id.toString(),
        userEmail: user.email as string,
        userName: (user.name as string) || "Anonymous",
        userImage: user.image as string | null | undefined,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error instanceof Error ? error : new Error("Failed to send message");
  }
}

// verify user is admin of a band
async function verifyAdmin(bandId: string) {
  if (!ObjectId.isValid(bandId)) throw new Error("Invalid band ID");

  const { db, user } = await getAuthUser();

  const band = await getBandsCollection(db).findOne({
    _id: new ObjectId(bandId),
  });
  if (!band) throw new Error("Band not found");

  const userId = user._id.toString();
  if (!isAdminOrCreator(band, userId))
    throw new Error("Only admins can perform this action");

  return { db, band, user, userId, isCreator: isBandCreator(band, userId) };
}

export async function deleteBandAction(bandId: string) {
  try {
    const { db, isCreator } = await verifyAdmin(bandId);

    if (!isCreator) {
      throw new Error("Only the band creator can delete the band");
    }

    await deleteBandCascade(db, bandId);

    return { success: true, message: "Band deleted" };
  } catch (error) {
    console.error("Error deleting band:", error);
    throw error instanceof Error ? error : new Error("Failed to delete band");
  }
}

export async function updateBandAction(
  bandId: string,
  name: string,
  description: string,
) {
  try {
    const { db } = await verifyAdmin(bandId);

    if (!name?.trim()) throw new Error("Band name is required");

    await getBandsCollection(db).updateOne(
      { _id: new ObjectId(bandId) },
      { $set: { name: name.trim(), description: description?.trim() || "" } },
    );

    return { success: true, message: "Band updated" };
  } catch (error) {
    console.error("Error updating band:", error);
    throw error instanceof Error ? error : new Error("Failed to update band");
  }
}

export async function addMemberAction(bandId: string, userId: string) {
  try {
    const { db, band } = await verifyAdmin(bandId);

    if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID");

    if (isMember(band, userId)) {
      return { success: true, message: "Already a member" };
    }

    // verify user exists
    const targetUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!targetUser) throw new Error("User not found");

    await getBandsCollection(db).updateOne(
      { _id: new ObjectId(bandId) },
      { $push: { members: { userId, role: "member" } } },
    );

    await setMemberBandDataActiveState(db, bandId, userId, true);

    return { success: true, message: "Member added" };
  } catch (error) {
    console.error("Error adding member:", error);
    throw error instanceof Error ? error : new Error("Failed to add member");
  }
}

export async function removeMemberAction(bandId: string, memberId: string) {
  try {
    const { db, band } = await verifyAdmin(bandId);

    if (isBandCreator(band, memberId)) {
      throw new Error("Cannot remove the band creator");
    }

    await getBandsCollection(db).updateOne(
      { _id: new ObjectId(bandId) },
      { $pull: { members: { userId: memberId } } },
    );

    await setMemberBandDataActiveState(db, bandId, memberId, false);

    return { success: true, message: "Member removed" };
  } catch (error) {
    console.error("Error removing member:", error);
    throw error instanceof Error ? error : new Error("Failed to remove member");
  }
}

export async function toggleAdminAction(bandId: string, memberId: string) {
  try {
    const { db, band } = await verifyAdmin(bandId);

    if (isBandCreator(band, memberId)) {
      throw new Error("Cannot change the creator's admin role");
    }

    if (!isMember(band, memberId)) {
      throw new Error("User is not a band member");
    }

    const entry = getMemberEntry(band, memberId);
    const isCurrentlyAdmin = entry?.role === "admin";
    const newRole: BandRole = isCurrentlyAdmin ? "member" : "admin";

    await getBandsCollection(db).updateOne(
      { _id: new ObjectId(bandId), "members.userId": memberId },
      { $set: { "members.$.role": newRole } },
    );

    return {
      success: true,
      isAdmin: !isCurrentlyAdmin,
      message: isCurrentlyAdmin ? "Admin role removed" : "Admin role granted",
    };
  } catch (error) {
    console.error("Error toggling admin:", error);
    throw error instanceof Error ? error : new Error("Failed to toggle admin");
  }
}

export async function leaveBandAction(bandId: string) {
  try {
    if (!ObjectId.isValid(bandId)) throw new Error("Invalid band ID");

    const { db, user } = await getAuthUser();

    const band = await getBandsCollection(db).findOne({
      _id: new ObjectId(bandId),
    });
    if (!band) throw new Error("Band not found");

    const userId = user._id.toString();
    if (!isMember(band, userId)) {
      throw new Error("You are not a member of this band");
    }

    // if only one member left, delete the band entirely
    if (band.members.length <= 1) {
      await deleteBandCascade(db, bandId);
      return {
        success: true,
        bandDeleted: true,
        message: "You left and the band was deleted",
      };
    }

    const wasCreator = isBandCreator(band, userId);

    await getBandsCollection(db).updateOne(
      { _id: new ObjectId(bandId) },
      { $pull: { members: { userId } } },
    );

    await setMemberBandDataActiveState(db, bandId, userId, false);

    // if the leaving user was creator, promote the last remaining member
    if (wasCreator) {
      const remainingMembers = band.members.filter((m) => m.userId !== userId);
      const newCreatorId = remainingMembers[remainingMembers.length - 1].userId;

      await getBandsCollection(db).updateOne(
        { _id: new ObjectId(bandId), "members.userId": newCreatorId },
        { $set: { "members.$.role": "creator" } },
      );
    }

    return { success: true, bandDeleted: false, message: "You left the band" };
  } catch (error) {
    console.error("Error leaving band:", error);
    throw error instanceof Error ? error : new Error("Failed to leave band");
  }
}

export async function transferCreatorAction(
  bandId: string,
  newCreatorId: string,
) {
  try {
    const { db, band, userId, isCreator } = await verifyAdmin(bandId);

    if (!isCreator) {
      throw new Error("Only the creator can transfer the creator role");
    }

    if (!ObjectId.isValid(newCreatorId)) throw new Error("Invalid user ID");

    if (!isMember(band, newCreatorId)) {
      throw new Error("Target user is not a band member");
    }

    if (isBandCreator(band, newCreatorId)) {
      throw new Error("User is already the creator");
    }

    // demote current creator to admin, promote new creator
    await getBandsCollection(db).updateOne(
      { _id: new ObjectId(bandId), "members.userId": userId },
      { $set: { "members.$.role": "admin" } },
    );
    await getBandsCollection(db).updateOne(
      { _id: new ObjectId(bandId), "members.userId": newCreatorId },
      { $set: { "members.$.role": "creator" } },
    );

    return { success: true, message: "Creator role transferred" };
  } catch (error) {
    console.error("Error transferring creator:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to transfer creator role");
  }
}
