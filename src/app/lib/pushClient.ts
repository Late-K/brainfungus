// browser side push helpers - subscribing this device and turning it off again.
// relies on /sw.js, which is only registered in production (see serviceWorkerRegister)

import { isIos, isStandalone } from "@/app/lib/installClient";

export function isPushSupported() {
  return (
    process.env.NODE_ENV === "production" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// ios only allows push once the app has been added to the home screen
export function needsHomeScreenInstall() {
  return isIos() && !isStandalone();
}

// the vapid key is base64url, but pushManager wants raw bytes
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function subscribeToPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Push notifications aren't set up yet");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications are blocked - allow them in your browser settings");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  return subscription.toJSON();
}

// returns the endpoint so the server copy can be removed too
export async function unsubscribeFromPush() {
  const subscription = await getPushSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription.endpoint;
}
