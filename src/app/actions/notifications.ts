"use server";

import { getAuthUser } from "@/app/lib/auth";
import { requireBandMemberContext } from "@/app/lib/serverUtils";
import { NotificationPrefs, NotificationType } from "@/app/types";

const notificationTypes: NotificationType[] = ["rehearsals", "chat", "setlists"];

type SubscriptionInput = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

// save this device's push subscription against the signed in user.
// keyed by endpoint so a device that switches account moves to the new user
export async function savePushSubscriptionAction(subscription: SubscriptionInput) {
  try {
    const { endpoint, keys } = subscription ?? {};
    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof keys?.p256dh !== "string" ||
      typeof keys?.auth !== "string"
    ) {
      throw new Error("Invalid push subscription");
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

    return { success: true };
  } catch (error) {
    console.error("savePushSubscriptionAction error:", error);
    throw error;
  }
}

export async function removePushSubscriptionAction(endpoint: string) {
  try {
    const { db, user } = await getAuthUser();
    await db
      .collection("push_subscriptions")
      .deleteOne({ endpoint, userId: user._id });
    return { success: true };
  } catch (error) {
    console.error("removePushSubscriptionAction error:", error);
    throw error;
  }
}

export async function getNotificationPrefsAction(): Promise<NotificationPrefs> {
  try {
    const { user } = await getAuthUser();
    const prefs = user.notificationPrefs ?? {};
    return {
      rehearsals: prefs.rehearsals ?? true,
      chat: prefs.chat ?? true,
      setlists: prefs.setlists ?? true,
    };
  } catch (error) {
    console.error("getNotificationPrefsAction error:", error);
    throw error;
  }
}

export async function setNotificationPrefAction(
  type: NotificationType,
  enabled: boolean,
) {
  try {
    if (!notificationTypes.includes(type)) {
      throw new Error("Invalid notification type");
    }

    const { db, user } = await getAuthUser();
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { [`notificationPrefs.${type}`]: enabled, updatedAt: new Date() } },
      );
    return { success: true, type, enabled };
  } catch (error) {
    console.error("setNotificationPrefAction error:", error);
    throw error;
  }
}

// per band mute - stored on the user as a list of band ids they don't want notifications from
export async function getBandNotificationsAction(bandId: string) {
  try {
    const { user, bandObjectId } = await requireBandMemberContext(bandId);
    const mutedBands: string[] = user.mutedBands ?? [];
    return { enabled: !mutedBands.includes(bandObjectId.toString()) };
  } catch (error) {
    console.error("getBandNotificationsAction error:", error);
    throw error;
  }
}

export async function setBandNotificationsAction(
  bandId: string,
  enabled: boolean,
) {
  try {
    const { db, user, bandObjectId } = await requireBandMemberContext(bandId);
    const id = bandObjectId.toString();
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        {
          [enabled ? "$pull" : "$addToSet"]: { mutedBands: id },
          $set: { updatedAt: new Date() },
        } as Record<string, unknown>,
      );
    return { success: true, enabled };
  } catch (error) {
    console.error("setBandNotificationsAction error:", error);
    throw error;
  }
}
