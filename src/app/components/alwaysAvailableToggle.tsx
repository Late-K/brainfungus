"use client";

import { useEffect, useState } from "react";
import {
  getAlwaysAvailableAction,
  setAlwaysAvailableUserAction,
} from "@/app/actions/users";
import SettingToggle from "@/app/components/settingToggle";

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
    <SettingToggle
      label="Always available for rehearsals"
      hint={
        alwaysAvailable
          ? "You are automatically marked available for all rehearsals in the next 7 days."
          : "Turn on to be automatically available for rehearsals in the coming week."
      }
      checked={alwaysAvailable}
      onChange={handleToggle}
    />
  );
}
