"use client";

import { useEffect, useState } from "react";
import {
  getLearntSongsPrivateAction,
  setLearntSongsPrivateAction,
} from "@/app/actions/users";
import SettingToggle from "@/app/components/settingToggle";

export default function LearntSongsPrivacyToggle() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLearntSongsPrivateAction().then((data) => {
      setIsPrivate(data.learntSongsPrivate);
      setLoading(false);
    });
  }, []);

  const handleToggle = async () => {
    const newValue = !isPrivate;
    setIsPrivate(newValue);
    try {
      await setLearntSongsPrivateAction(newValue);
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
