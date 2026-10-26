"use server";

import { getAuthUser } from "@/app/lib/server/auth";
import { requireBandMemberContext } from "@/app/lib/server/utils";
import { runAction, UserError } from "@/app/lib/actionResult";
import { readBoolean, readOneOf, readString } from "@/app/lib/validate";
import { NotificationPrefs, NotificationType } from "@/app/types";

const notificationTypes: NotificationType[] = [
  "rehearsals",
  "chat",
  "setlists",
  "invites",
];

type SubscriptionInput = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

// save this device's push subscription against the signed in user.
// keyed by endpoint so a device that switches account moves to the new user
export async function savePushSubscriptionAction(
  subscription: SubscriptionInput,
) {
  return runAction("Failed to turn on notifications", async () => {
    const { endpoint, keys } = subscription ?? {};
    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      endpoint.length > 2000 ||
      typeof keys?.p256dh !== "string" ||
      typeof keys?.auth !== "string"
    ) {
      throw new UserError("Invalid push subscription");
    }

    const { db, user } = await getAuthUser();
    await db.collection("push_subscriptions").updateOne(
      { endpoint },
      {
        $set: {
          userId: user._id,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  });
}

export async function removePushSubscriptionAction(endpoint: string) {
  return runAction("Failed to turn off notifications", async () => {
    const endpointUrl = readString(endpoint, "push subscription", 2000);
    const { db, user } = await getAuthUser();
    await db
      .collection("push_subscriptions")
      .deleteOne({ endpoint: endpointUrl, userId: user._id });
  });
}

export async function getNotificationPrefsAction() {
  return runAction(
    "Failed to load notification settings",
    async (): Promise<NotificationPrefs> => {
      const { user } = await getAuthUser();
      const prefs = user.notificationPrefs ?? {};
      return {
        rehearsals: prefs.rehearsals ?? true,
        chat: prefs.chat ?? true,
        setlists: prefs.setlists ?? true,
        invites: prefs.invites ?? true,
      };
    },
  );
}

export async function setNotificationPrefAction(
  type: NotificationType,
  enabled: boolean,
) {
  return runAction("Failed to save notification setting", async () => {
    const prefType = readOneOf(type, notificationTypes, "notification type");
    const value = readBoolean(enabled, "notification setting");

    const { db, user } = await getAuthUser();
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          [`notificationPrefs.${prefType}`]: value,
          updatedAt: new Date(),
        },
      },
    );
    return { type: prefType, enabled: value };
  });
}

// per band mute - stored on the user as a list of band ids they don't want notifications from
export async function getBandNotificationsAction(bandId: string) {
  return runAction("Failed to load notification setting", async () => {
    const { user, bandObjectId } = await requireBandMemberContext(bandId);
    const mutedBands: string[] = user.mutedBands ?? [];
    return { enabled: !mutedBands.includes(bandObjectId.toString()) };
  });
}

export async function setBandNotificationsAction(
  bandId: string,
  enabled: boolean,
) {
  return runAction("Failed to save notification setting", async () => {
    const value = readBoolean(enabled, "notification setting");
    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);
    const id = bandObjectId.toString();
    await db.collection("users").updateOne({ _id: user._id }, {
      [value ? "$pull" : "$addToSet"]: { mutedBands: id },
      $set: { updatedAt: new Date() },
    } as Record<string, unknown>);
    return { enabled: value };
  });
}
