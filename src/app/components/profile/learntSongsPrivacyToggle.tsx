"use client";

import { useEffect, useState } from "react";
import {
  getLearntSongsPrivateAction,
  setLearntSongsPrivateAction,
} from "@/app/actions/users";
import SettingToggle from "@/app/components/ui/settingToggle";
import { unwrapAction } from "@/app/lib/actionResult";

export default function LearntSongsPrivacyToggle() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLearntSongsPrivateAction()
      .then(unwrapAction)
      .then((data) => setIsPrivate(data.learntSongsPrivate))
      .catch((err) => console.error("Failed to load setting:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    const newValue = !isPrivate;
    setIsPrivate(newValue);
    try {
      unwrapAction(await setLearntSongsPrivateAction(newValue));
    } catch {
      setIsPrivate(!newValue);
    }
  };

  if (loading) return null;

  return (
    <SettingToggle
      label="Keep my learnt songs private"
      hint={
        isPrivate
          ? "Other users can see your profile, but not your learnt songs."
          : "Other users can view and compare your learnt songs."
      }
      checked={isPrivate}
      onChange={handleToggle}
    />
  );
}
