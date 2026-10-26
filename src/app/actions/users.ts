"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import { isMusicApp } from "@/app/lib/musicAppUtils";
import { runAction, UserError } from "@/app/lib/actionResult";
import { readBoolean } from "@/app/lib/validate";
import { MusicApp } from "@/app/types";

// sets one of the current user's own settings
async function setUserSetting(field: string, value: unknown) {
  const { db, user } = await getAuthUser();
  await db
    .collection("users")
    .updateOne(
      { _id: user._id },
      { $set: { [field]: value, updatedAt: new Date() } },
    );
}

export async function getAlwaysAvailableAction() {
  return runAction("Failed to load setting", async () => {
    const { user } = await getAuthUser();
    return { alwaysAvailable: (user.alwaysAvailable as boolean) ?? false };
  });
}

export async function setAlwaysAvailableUserAction(alwaysAvailable: boolean) {
  return runAction("Failed to save setting", async () => {
    const value = readBoolean(alwaysAvailable, "setting");
    await setUserSetting("alwaysAvailable", value);
    return { alwaysAvailable: value };
  });
}

export async function getLearntSongsPrivateAction() {
  return runAction("Failed to load setting", async () => {
    const { user } = await getAuthUser();
    return {
      learntSongsPrivate: (user.learntSongsPrivate as boolean) ?? false,
    };
  });
}

export async function setLearntSongsPrivateAction(learntSongsPrivate: boolean) {
  return runAction("Failed to save setting", async () => {
    const value = readBoolean(learntSongsPrivate, "setting");
    await setUserSetting("learntSongsPrivate", value);
    return { learntSongsPrivate: value };
  });
}

export async function getMusicAppAction() {
  return runAction("Failed to load setting", async () => {
    const { user } = await getAuthUser();
    return {
      musicApp: isMusicApp(user.musicApp) ? (user.musicApp as MusicApp) : null,
    };
  });
}

export async function setMusicAppAction(musicApp: MusicApp | null) {
  return runAction("Failed to save setting", async () => {
    if (musicApp !== null && !isMusicApp(musicApp)) {
      throw new UserError("Invalid music app");
    }
    await setUserSetting("musicApp", musicApp);
    return { musicApp };
  });
}
