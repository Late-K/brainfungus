"use client";

import { useEffect, useState } from "react";
import {
  getPrivacySettingsAction,
  setPrivacySettingAction,
} from "@/app/actions/users";
import SettingToggle from "@/app/components/ui/settingToggle";
import { PrivacySetting, PrivacySettings as Settings } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

const toggles: {
  setting: PrivacySetting;
  label: string;
  hintOn: string;
  hintOff: string;
}[] = [
  {
    setting: "availabilityPrivate",
    label: "Keep my day availability private",
    hintOn:
      "Bandmates can't see the days you're free, and they won't mark you available for rehearsals. Your rehearsal answers are still shown.",
    hintOff:
      "Bandmates can see the days you're free on the calendar. Turn on for privacy, or while you're away.",
  },
  {
    setting: "learntSongsPrivate",
    label: "Keep my learnt songs private",
    hintOn: "Other users can see your profile, but not your learnt songs.",
    hintOff: "Other users can view and compare your learnt songs.",
  },
  {
    setting: "learningSongsPrivate",
    label: "Keep my learning songs private",
    hintOn:
      "Other users can see your profile, but not the songs you're learning.",
    hintOff: "Other users can see the songs you're currently learning.",
  },
];

// every privacy toggle in one place, saved as soon as it's flipped
export default function PrivacySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getPrivacySettingsAction()
      .then(unwrapAction)
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings:", err));
  }, []);

  const handleToggle = async (setting: PrivacySetting) => {
    if (!settings) return;
    const newValue = !settings[setting];
    const update = (value: boolean) =>
      setSettings((prev) => (prev ? { ...prev, [setting]: value } : prev));

    update(newValue);
    try {
      unwrapAction(await setPrivacySettingAction(setting, newValue));
    } catch {
      update(!newValue);
    }
  };

  if (!settings) return null;

  return (
    <>
      {toggles.map(({ setting, label, hintOn, hintOff }) => (
        <SettingToggle
          key={setting}
          label={label}
          hint={settings[setting] ? hintOn : hintOff}
          checked={settings[setting]}
          onChange={() => handleToggle(setting)}
        />
      ))}
    </>
  );
}
