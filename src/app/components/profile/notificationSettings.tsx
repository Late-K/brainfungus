"use client";

// push notification opt-in for this device, plus which kinds of notification to get

import { useEffect, useState } from "react";
import {
  getNotificationPrefsAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  setNotificationPrefAction,
} from "@/app/actions/notifications";
import {
  getPushSubscription,
  isPushSupported,
  needsHomeScreenInstall,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/app/lib/pushClient";
import { NotificationPrefs, NotificationType } from "@/app/types";
import SettingToggle from "@/app/components/ui/settingToggle";
import { unwrapAction } from "@/app/lib/actionResult";

const prefOptions: { type: NotificationType; label: string }[] = [
  { type: "rehearsals", label: "Rehearsals" },
  { type: "chat", label: "Band chat" },
  { type: "mentions", label: "@Mentions" },
  { type: "setlists", label: "Active setlist" },
  { type: "invites", label: "Band invites" },
];

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setNeedsInstall(needsHomeScreenInstall());
      setPrefs(unwrapAction(await getNotificationPrefsAction()));

      if (!isPushSupported()) return;
      setSupported(true);

      const subscription = await getPushSubscription();
      const isEnabled = !!subscription && Notification.permission === "granted";
      setEnabled(isEnabled);

      // re-save in case this device was last subscribed under a different account
      if (isEnabled)
        unwrapAction(await savePushSubscriptionAction(subscription.toJSON()));
    };

    load()
      .catch((err) =>
        console.error("Failed to load notification settings:", err),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    setBusy(true);
    setError("");
    try {
      if (enabled) {
        const endpoint = await unsubscribeFromPush();
        if (endpoint)
          unwrapAction(await removePushSubscriptionAction(endpoint));
        setEnabled(false);
      } else {
        const subscription = await subscribeToPush();
        unwrapAction(await savePushSubscriptionAction(subscription));
        setEnabled(true);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update notifications",
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePrefToggle = async (type: NotificationType) => {
    if (!prefs) return;
    const newValue = !prefs[type];
    setPrefs({ ...prefs, [type]: newValue });
    try {
      unwrapAction(await setNotificationPrefAction(type, newValue));
    } catch {
      setPrefs((prev) => (prev ? { ...prev, [type]: !newValue } : prev));
    }
  };

  if (loading) return null;

  let hint = enabled
    ? "You'll get notified about rehearsals, band chat messages, active setlist changes and band invites."
    : "Get notified about upcoming rehearsals, new chat messages, active setlist changes and band invites.";
  if (!supported) {
    hint = needsInstall
      ? "On iPhone and iPad, add Brain Fungus to your Home Screen to turn on notifications."
      : "This browser doesn't support push notifications.";
  }

  return (
    <div>
      <SettingToggle
        label="Push notifications on this device"
        hint={hint}
        checked={enabled}
        onChange={handleToggle}
        disabled={busy || !supported}
      />

      {enabled && prefs && (
        <div className="setting-subrows">
          {prefOptions.map(({ type, label }) => (
            <SettingToggle
              key={type}
              label={label}
              checked={prefs[type]}
              onChange={() => handlePrefToggle(type)}
              compact
            />
          ))}
        </div>
      )}

      {error && <p className="alert alert-error notification-error">{error}</p>}
    </div>
  );
}
