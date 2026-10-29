"use client";

// a Settings button on the profile that opens every setting in one menu,
// privacy first. installing the app stays on the profile card itself

import { useEffect, useState } from "react";
import MusicAppSettings from "@/app/components/profile/musicAppSettings";
import NotificationSettings from "@/app/components/profile/notificationSettings";
import PrivacySettings from "@/app/components/profile/privacySettings";

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="button button-small button-tertiary"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        ⚙ Settings
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-card settings-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-menu-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-header">
              <h3 id="settings-menu-title">Settings</h3>
              <button
                className="button button-small"
                onClick={() => setIsOpen(false)}
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <h4 className="settings-title settings-title-first">Privacy</h4>
            <div className="settings-list">
              <PrivacySettings />
            </div>
            <h4 className="settings-title">App</h4>
            <div className="settings-list">
              <MusicAppSettings />
              <NotificationSettings />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
