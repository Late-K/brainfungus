import "server-only";

// web push helpers - sends a notification to every device a user has subscribed on.
// server only, since it needs the private vapid key

import webpush from "web-push";
import { after } from "next/server";
import { Db, Document, ObjectId } from "mongodb";
import { NotificationType, PushPayload } from "@/app/types";

let vapidConfigured = false;

// the push services browsers actually hand out subscriptions for (chrome and
// other chromium browsers, firefox, safari, edge). the server posts to
// whatever endpoint is saved, so anything else would let a user point it at
// any url they like
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "web.push.apple.com",
];
const PUSH_SERVICE_HOST_SUFFIXES = [
  ".push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com",
];

export function isPushServiceEndpoint(endpoint: unknown) {
  if (typeof endpoint !== "string" || endpoint.length > 2000) return false;
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    return (
      url.protocol === "https:" &&
      !url.port &&
      (PUSH_SERVICE_HOSTS.includes(host) ||
        PUSH_SERVICE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)))
    );
  } catch {
    return false;
  }
}

type PushOptions = {
  // for things aimed at one person, like an @mention, that should still
  // reach them when they've muted the band
  ignoreBandMute?: boolean;
};

function configureVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  // apple rejects localhost subjects, so set VAPID_SUBJECT to the live https url or a mailto: in production
  const subject = process.env.VAPID_SUBJECT || process.env.NEXTAUTH_URL;
  if (!publicKey || !privateKey || !subject) {
    console.warn("Push notifications disabled - VAPID env vars missing");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendPushToUsers(
  db: Db,
  userIds: ObjectId[],
  type: NotificationType,
  bandId: string,
  payload: PushPayload,
  { ignoreBandMute = false }: PushOptions = {},
) {
  if (userIds.length === 0 || !configureVapid()) return;

  // only users who haven't switched this notification type off or muted this band
  const users = await db
    .collection("users")
    .find({
      _id: { $in: userIds },
      [`notificationPrefs.${type}`]: { $ne: false },
      ...(ignoreBandMute ? {} : { mutedBands: { $ne: bandId } }),
    })
    .project({ _id: 1 })
    .toArray();
  if (users.length === 0) return;

  const subscriptions = await db
    .collection("push_subscriptions")
    .find({ userId: { $in: users.map((u) => u._id) } })
    .toArray();

  const expiredIds: ObjectId[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      // saved before endpoints were checked - drop it rather than post to it
      if (!isPushServiceEndpoint(sub.endpoint)) {
        expiredIds.push(sub._id);
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
      } catch (error) {
        // 404/410 means the browser dropped the subscription, so stop sending to it
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          expiredIds.push(sub._id);
        } else {
          console.error("Failed to send push notification:", error);
        }
      }
    }),
  );

  if (expiredIds.length > 0) {
    await db
      .collection("push_subscriptions")
      .deleteMany({ _id: { $in: expiredIds } });
  }
}

// notify every band member except the person who caused it.
// runs after the response is sent so the action isn't slowed down by the push services
export function notifyBandMembers(
  db: Db,
  band: Document,
  excludeUserId: string,
  type: NotificationType,
  payload: PushPayload,
) {
  const memberIds = ((band.members as Array<{ userId: string }>) ?? [])
    .map((m) => m.userId)
    .filter((id) => id !== excludeUserId);

  notifyUsers(db, memberIds, type, band._id.toString(), payload);
}

// notify specific users, e.g. people invited to a band who aren't members yet.
// also runs after the response is sent
export function notifyUsers(
  db: Db,
  userIds: string[],
  type: NotificationType,
  bandId: string,
  payload: PushPayload,
  options?: PushOptions,
) {
  const objectIds = userIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  after(async () => {
    try {
      await sendPushToUsers(db, objectIds, type, bandId, payload, options);
    } catch (error) {
      console.error("Failed to send notifications:", error);
    }
  });
}

export function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
