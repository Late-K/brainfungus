"use client";

// per band notification on/off, shown in the band settings modal

import { useEffect, useState } from "react";
import {
  getBandNotificationsAction,
  setBandNotificationsAction,
} from "@/app/actions/notifications";
import { getPushSubscription } from "@/app/lib/pushClient";

export default function BandNotificationToggle({ bandId }: { bandId: string }) {
  const [enabled, setEnabled] = useState(true);
  const [deviceEnabled, setDeviceEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBandNotificationsAction(bandId), getPushSubscription()])
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
      await setBandNotificationsAction(bandId, newValue);
    } catch {
      setEnabled(!newValue);
    }
  };

  if (loading) return null;

  let hint = enabled
    ? "You'll get rehearsal, chat and setlist notifications from this band."
    : "You won't get any notifications from this band.";
  if (!deviceEnabled) {
    hint += " Notifications are off on this device - turn them on from your Profile.";
  }

  return (
    <div className="always-available-section band-notification-toggle">
      <label
        className={`availability-toggle ${enabled ? "availability-toggle-available" : "availability-toggle-unavailable"}`}
      >
        <input type="checkbox" checked={enabled} onChange={handleToggle} />
        Notifications from this band
      </label>
      <p className="always-available-hint">{hint}</p>
    </div>
  );
}
