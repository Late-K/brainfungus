"use server";

import { put } from "@vercel/blob";
import { getAuthUser } from "@/app/lib/server/auth";
import {
  buildImageBlobPath,
  userImageUrl,
  validateImageFile,
} from "@/app/lib/server/customSongImages";
import { deleteBlobsQuietly } from "@/app/lib/server/blobStorage";
import { isMusicApp } from "@/app/lib/musicAppUtils";
import { runAction, UserError } from "@/app/lib/actionResult";
import { readBoolean, readDisplayName, readOneOf } from "@/app/lib/validate";
import { MusicApp, PrivacySetting, PrivacySettings } from "@/app/types";

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

// availabilityPrivate hides the user's day availability from their bandmates
// and stops it auto marking them available for rehearsals. the song ones hide
// those lists from other people viewing their profile
const privacy_settings: readonly PrivacySetting[] = [
  "availabilityPrivate",
  "learntSongsPrivate",
  "learningSongsPrivate",
];

export async function getPrivacySettingsAction() {
  return runAction("Failed to load settings", async () => {
    const { user } = await getAuthUser();
    return Object.fromEntries(
      privacy_settings.map((setting) => [setting, user[setting] === true]),
    ) as PrivacySettings;
  });
}

export async function setPrivacySettingAction(
  setting: PrivacySetting,
  value: boolean,
) {
  return runAction("Failed to save setting", async () => {
    const field = readOneOf(setting, privacy_settings, "setting");
    const checked = readBoolean(value, "setting");
    await setUserSetting(field, checked);
    return { [field]: checked };
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

// a user's own name and picture replace the ones from google everywhere. the
// google ones are kept (googleName / googleImage) so they can switch back -
// accounts from before custom profiles get them saved on their first change

export async function setDisplayNameAction(name: string) {
  return runAction("Failed to save name", async () => {
    const value = readDisplayName(name);
    const { db, user } = await getAuthUser();
    const $set: Record<string, unknown> = {
      name: value,
      customName: true,
      updatedAt: new Date(),
    };
    if (user.googleName === undefined) $set.googleName = user.name ?? null;
    await db.collection("users").updateOne({ _id: user._id }, { $set });
    return { name: value };
  });
}

export async function resetDisplayNameAction() {
  return runAction("Failed to reset name", async () => {
    const { db, user } = await getAuthUser();
    const name =
      user.googleName !== undefined
        ? (user.googleName as string | null)
        : ((user.name as string | null) ?? null);
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { name, updatedAt: new Date() }, $unset: { customName: "" } },
      );
    return { name };
  });
}

export async function uploadProfileImageAction(formData: FormData) {
  return runAction("Failed to upload picture", async () => {
    const file = validateImageFile(formData.get("image"));
    const { db, user } = await getAuthUser();
    const id = user._id.toString();

    await deleteBlobsQuietly(user.imageBlobUrl, "profile image");

    const blob = await put(
      buildImageBlobPath("users", id, id, file.name || "image"),
      file,
      { access: "private", addRandomSuffix: false, contentType: file.type },
    );

    const image = userImageUrl(id, Date.now());
    const $set: Record<string, unknown> = {
      imageBlobUrl: blob.url,
      imageMimeType: file.type,
      image,
      updatedAt: new Date(),
    };
    if (user.googleImage === undefined && !user.imageBlobUrl) {
      $set.googleImage = user.image ?? null;
    }
    await db.collection("users").updateOne({ _id: user._id }, { $set });

    return { image };
  });
}

export async function deleteProfileImageAction() {
  return runAction("Failed to remove picture", async () => {
    const { db, user } = await getAuthUser();

    await deleteBlobsQuietly(user.imageBlobUrl, "profile image");

    const image = (user.googleImage as string | null | undefined) ?? null;
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { image, updatedAt: new Date() },
        $unset: { imageBlobUrl: "", imageMimeType: "" },
      },
    );
    return { image };
  });
}
