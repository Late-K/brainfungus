"use server";

import { getAuthUser } from "@/app/lib/auth";

export async function getAlwaysAvailableAction() {
  try {
    const { user } = await getAuthUser();
    return { alwaysAvailable: user.alwaysAvailable ?? false };
  } catch (error) {
    console.error("getAlwaysAvailableAction error:", error);
    throw error;
  }
}

export async function setAlwaysAvailableUserAction(alwaysAvailable: boolean) {
  try {
    const { db, user } = await getAuthUser();
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { alwaysAvailable, updatedAt: new Date() } },
      );
    return { success: true, alwaysAvailable };
  } catch (error) {
    console.error("setAlwaysAvailableUserAction error:", error);
    throw error;
  }
}
