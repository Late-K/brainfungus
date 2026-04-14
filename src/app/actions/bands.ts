"use server";

import { getAuthUser } from "@/app/lib/auth";
import { ObjectId, Db } from "mongodb";

// delete a band and all its related data
async function deleteBandCascade(db: Db, bandId: string) {
  const oid = new ObjectId(bandId);
  await db.collection("bands").deleteOne({ _id: oid });
  await db.collection("band_messages").deleteMany({ bandId: oid });
  await db.collection("setlists").deleteMany({ bandId: oid });
  await db.collection("customSongs").deleteMany({ bandId: oid });
  await db.collection("learnt_songs").deleteMany({ bandId: oid });
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

    // ensure the creator is included in the members list
    const allMemberIds = Array.from(
      new Set([user._id.toString(), ...memberIds]),
    );

    const newBand = {
      name,
      description: description || "",
      creatorId: user._id,
      adminIds: [user._id.toString()],
      memberIds: allMemberIds,
      createdAt: new Date(),
    };

    const result = await db.collection("bands").insertOne(newBand);

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

    const { db, user, session } = await getAuthUser();

    if (!ObjectId.isValid(bandId)) {
      throw new Error("Invalid band ID");
    }

    // verify user is a band member
    const band = await db
      .collection("bands")
      .findOne({ _id: new ObjectId(bandId) });

    if (!band) {
      throw new Error("Band not found");
    }

    if (!band.memberIds.includes(user._id.toString())) {
      throw new Error("Not a band member");
    }

    // insert message
    const newMessage = {
      bandId: new ObjectId(bandId),
      userId: user._id,
      userEmail: session.user!.email!,
      userName: session.user!.name || "Anonymous",
      userImage: session.user!.image,
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
        userEmail: session.user!.email!,
        userName: session.user!.name || "Anonymous",
        userImage: session.user!.image,
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

  const band = await db
    .collection("bands")
    .findOne({ _id: new ObjectId(bandId) });
  if (!band) throw new Error("Band not found");

  const userId = user._id.toString();
  const isCreator = band.creatorId?.toString() === userId;
  const adminIds: string[] = band.adminIds ?? [];
  const isAdmin = isCreator || adminIds.includes(userId);

  if (!isAdmin) throw new Error("Only admins can perform this action");

  return { db, band, user, userId, isCreator };
}

export async function deleteBandAction(bandId: string) {
  try {
    const { db, band, isCreator } = await verifyAdmin(bandId);

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

    await db
      .collection("bands")
      .updateOne(
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
    const { db } = await verifyAdmin(bandId);

    if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID");

    // verify user exists
    const targetUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!targetUser) throw new Error("User not found");

    await db
      .collection("bands")
      .updateOne(
        { _id: new ObjectId(bandId) },
        { $addToSet: { memberIds: userId } },
      );

    return { success: true, message: "Member added" };
  } catch (error) {
    console.error("Error adding member:", error);
    throw error instanceof Error ? error : new Error("Failed to add member");
  }
}

export async function removeMemberAction(bandId: string, memberId: string) {
  try {
    const { db, band } = await verifyAdmin(bandId);

    // cannot remove the creator
    if (band.creatorId?.toString() === memberId) {
      throw new Error("Cannot remove the band creator");
    }

    await db.collection("bands").updateOne(
      { _id: new ObjectId(bandId) },
      {
        $pull: {
          memberIds: memberId,
          adminIds: memberId,
        } as any,
      },
    );

    return { success: true, message: "Member removed" };
  } catch (error) {
    console.error("Error removing member:", error);
    throw error instanceof Error ? error : new Error("Failed to remove member");
  }
}

export async function toggleAdminAction(bandId: string, memberId: string) {
  try {
    const { db, band } = await verifyAdmin(bandId);

    // cannot change creator's admin status
    if (band.creatorId?.toString() === memberId) {
      throw new Error("Cannot change the creator's admin role");
    }

    // check if member is in the band
    if (!band.memberIds.includes(memberId)) {
      throw new Error("User is not a band member");
    }

    const adminIds: string[] = band.adminIds ?? [];
    const isCurrentlyAdmin = adminIds.includes(memberId);

    if (isCurrentlyAdmin) {
      await db
        .collection("bands")
        .updateOne(
          { _id: new ObjectId(bandId) },
          { $pull: { adminIds: memberId } as any },
        );
    } else {
      await db
        .collection("bands")
        .updateOne(
          { _id: new ObjectId(bandId) },
          { $addToSet: { adminIds: memberId } },
        );
    }

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

    const band = await db
      .collection("bands")
      .findOne({ _id: new ObjectId(bandId) });
    if (!band) throw new Error("Band not found");

    const userId = user._id.toString();
    if (!band.memberIds.includes(userId)) {
      throw new Error("You are not a member of this band");
    }

    // if only one member left, delete the band entirely
    if (band.memberIds.length <= 1) {
      await deleteBandCascade(db, bandId);
      return {
        success: true,
        bandDeleted: true,
        message: "You left and the band was deleted",
      };
    }

    const isCreator = band.creatorId?.toString() === userId;

    // remove from members and admins
    await db.collection("bands").updateOne(
      { _id: new ObjectId(bandId) },
      {
        $pull: {
          memberIds: userId,
          adminIds: userId,
        } as any,
      },
    );

    // if the leaving user is the creator, transfer to the last member in memberIds
    if (isCreator) {
      const remainingMembers = band.memberIds.filter(
        (id: string) => id !== userId,
      );
      const newCreatorId = remainingMembers[remainingMembers.length - 1];

      await db.collection("bands").updateOne(
        { _id: new ObjectId(bandId) },
        {
          $set: { creatorId: new ObjectId(newCreatorId) },
          $addToSet: { adminIds: newCreatorId },
        },
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
    const { db, band, isCreator } = await verifyAdmin(bandId);

    if (!isCreator) {
      throw new Error("Only the creator can transfer the creator role");
    }

    if (!ObjectId.isValid(newCreatorId)) throw new Error("Invalid user ID");

    if (!band.memberIds.includes(newCreatorId)) {
      throw new Error("Target user is not a band member");
    }

    if (band.creatorId?.toString() === newCreatorId) {
      throw new Error("User is already the creator");
    }

    await db.collection("bands").updateOne(
      { _id: new ObjectId(bandId) },
      {
        $set: { creatorId: new ObjectId(newCreatorId) },
        $addToSet: { adminIds: newCreatorId },
      },
    );

    return { success: true, message: "Creator role transferred" };
  } catch (error) {
    console.error("Error transferring creator:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to transfer creator role");
  }
}
