"use client";

import { useEffect, useState } from "react";
import {
  getAlwaysAvailableAction,
  setAlwaysAvailableUserAction,
} from "@/app/actions/users";

export default function AlwaysAvailableToggle() {
  const [alwaysAvailable, setAlwaysAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlwaysAvailableAction().then((data) => {
      setAlwaysAvailable(data.alwaysAvailable);
      setLoading(false);
    });
  }, []);

  const handleToggle = async () => {
    const newValue = !alwaysAvailable;
    setAlwaysAvailable(newValue);
    try {
      await setAlwaysAvailableUserAction(newValue);
    } catch {
      setAlwaysAvailable(!newValue);
    }
  };

  if (loading) return null;

  return (
    <div className="always-available-section">
      <label
        className={`availability-toggle ${alwaysAvailable ? "availability-toggle-available" : "availability-toggle-unavailable"}`}
      >
        <input
          type="checkbox"
          checked={alwaysAvailable}
          onChange={handleToggle}
        />
        Always available for rehearsals
      </label>
      <p className="always-available-hint">
        {alwaysAvailable
          ? "You are automatically marked available for all rehearsals in the next 7 days."
          : "Toggle on to be automatically available for rehearsals in the coming week."}
      </p>
    </div>
  );
}
