"use server";

import { getAuthUser } from "@/app/lib/auth";
import { COLLECTIONS } from "@/app/lib/serverData";

export async function getAlwaysAvailableAction() {
  const { user } = await getAuthUser();
  return { alwaysAvailable: user.alwaysAvailable ?? false };
}

export async function setAlwaysAvailableUserAction(alwaysAvailable: boolean) {
  const { db, user } = await getAuthUser();
  await db
    .collection(COLLECTIONS.users)
    .updateOne(
      { _id: user._id },
      { $set: { alwaysAvailable, updatedAt: new Date() } },
    );
  return { success: true, alwaysAvailable };
}
