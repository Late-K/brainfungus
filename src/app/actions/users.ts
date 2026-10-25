"use server";

import { getAuthUser } from "@/app/lib/auth";
import { isMusicApp } from "@/app/lib/musicAppUtils";
import { MusicApp } from "@/app/types";

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

export async function getLearntSongsPrivateAction() {
  try {
    const { user } = await getAuthUser();
    return { learntSongsPrivate: user.learntSongsPrivate ?? false };
  } catch (error) {
    console.error("getLearntSongsPrivateAction error:", error);
    throw error;
  }
}

export async function setLearntSongsPrivateAction(learntSongsPrivate: boolean) {
  try {
    const { db, user } = await getAuthUser();
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { learntSongsPrivate, updatedAt: new Date() } },
      );
    return { success: true, learntSongsPrivate };
  } catch (error) {
    console.error("setLearntSongsPrivateAction error:", error);
    throw error;
  }
}

export async function getMusicAppAction() {
  try {
    const { user } = await getAuthUser();
    return { musicApp: isMusicApp(user.musicApp) ? user.musicApp : null };
  } catch (error) {
    console.error("getMusicAppAction error:", error);
    throw error;
  }
}

export async function setMusicAppAction(musicApp: MusicApp | null) {
  try {
    if (musicApp !== null && !isMusicApp(musicApp)) {
      throw new Error("Invalid music app");
    }

    const { db, user } = await getAuthUser();
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { musicApp, updatedAt: new Date() } },
      );
    return { success: true, musicApp };
  } catch (error) {
    console.error("setMusicAppAction error:", error);
    throw error;
  }
}
