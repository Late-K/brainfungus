"use client";

// per band notification on/off, shown in the band settings modal

import { useEffect, useState } from "react";
import {
  getBandNotificationsAction,
  setBandNotificationsAction,
} from "@/app/actions/notifications";
import { getPushSubscription } from "@/app/lib/pushClient";
import SettingToggle from "@/app/components/ui/settingToggle";
import { unwrapAction } from "@/app/lib/actionResult";

export default function BandNotificationToggle({ bandId }: { bandId: string }) {
  const [enabled, setEnabled] = useState(true);
  const [deviceEnabled, setDeviceEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getBandNotificationsAction(bandId).then(unwrapAction),
      getPushSubscription(),
    ])
      .then(([data, subscription]) => {
        setEnabled(data.enabled);
        setDeviceEnabled(!!subscription);
      })
      .catch((err) => console.error("Failed to load band notifications:", err))
      .finally(() => setLoading(false));
  }, [bandId]);

  const handleToggle = async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    try {
      unwrapAction(await setBandNotificationsAction(bandId, newValue));
    } catch {
      setEnabled(!newValue);
    }
  };

  if (loading) return null;

  let hint = enabled
    ? "You'll get rehearsal, chat and setlist notifications from this band."
    : "You won't get any notifications from this band.";
  if (!deviceEnabled) {
    hint +=
      " Notifications are off on this device - turn them on from your Profile.";
  }

  return (
    <div className="settings-list band-notification-toggle">
      <SettingToggle
        label="Notifications from this band"
        hint={hint}
        checked={enabled}
        onChange={handleToggle}
      />
    </div>
  );
}
