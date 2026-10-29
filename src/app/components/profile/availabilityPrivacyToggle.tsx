"use client";

import { useEffect, useState } from "react";
import {
  getAvailabilityPrivateAction,
  setAvailabilityPrivateAction,
} from "@/app/actions/users";
import SettingToggle from "@/app/components/ui/settingToggle";
import { unwrapAction } from "@/app/lib/actionResult";

export default function AvailabilityPrivacyToggle() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAvailabilityPrivateAction()
      .then(unwrapAction)
      .then((data) => setIsPrivate(data.availabilityPrivate))
      .catch((err) => console.error("Failed to load setting:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    const newValue = !isPrivate;
    setIsPrivate(newValue);
    try {
      unwrapAction(await setAvailabilityPrivateAction(newValue));
    } catch {
      setIsPrivate(!newValue);
    }
  };

  if (loading) return null;

  return (
    <SettingToggle
      label="Keep my day availability private"
      hint={
        isPrivate
          ? "Bandmates can't see the days you're free, and they won't mark you available for rehearsals. Your rehearsal answers are still shown."
          : "Bandmates can see the days you're free on the calendar. Turn on for privacy, or while you're away."
      }
      checked={isPrivate}
      onChange={handleToggle}
    />
  );
}
