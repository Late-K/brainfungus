"use client";

import { useEffect, useState } from "react";
import {
  getLearntSongsPrivateAction,
  setLearntSongsPrivateAction,
} from "@/app/actions/users";

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
    <div className="always-available-section">
      <label
        className={`availability-toggle ${isPrivate ? "availability-toggle-available" : "availability-toggle-unavailable"}`}
      >
        <input type="checkbox" checked={isPrivate} onChange={handleToggle} />
        Keep my learnt songs private
      </label>
      <p className="always-available-hint">
        {isPrivate
          ? "Other users can see your profile, but not your learnt songs."
          : "Other users can view and compare your learnt songs."}
      </p>
    </div>
  );
}
