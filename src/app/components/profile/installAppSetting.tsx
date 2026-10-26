"use client";

// install the app row - hidden once brain fungus is installed.
// chrome/edge/android get a real install button, ios only allows it from the share menu so it gets steps instead

import { useState } from "react";
import { useInstallPrompt } from "@/app/lib/installClient";

export default function InstallAppSetting() {
  const { mode, canPrompt, installed, promptInstall } = useInstallPrompt();
  const [showSteps, setShowSteps] = useState(false);

  if (!mode || mode === "standalone" || installed) return null;
  // no prompt means it's already installed or this browser can't install apps
  if (mode === "browser" && !canPrompt) return null;

  return (
    <div className="setting-block">
      <div className="setting-inline">
        <span className="setting-text">
          <span className="setting-label">Install the app</span>
          <span className="setting-hint">
            Open Brain Fungus from your home screen like any other app
            {mode === "ios" && ", and turn on notifications"}.
          </span>
        </span>
        {mode === "ios" ? (
          <button
            type="button"
            className="button button-small"
            onClick={() => setShowSteps((shown) => !shown)}
            aria-expanded={showSteps}
          >
            {showSteps ? "Hide" : "Show me how"}
          </button>
        ) : (
          <button type="button" className="button button-primary button-small" onClick={promptInstall}>
            Install
          </button>
        )}
      </div>

      {showSteps && (
        <ol className="setting-steps">
          <li>
            Tap <strong>Share</strong> in Safari (on newer iPhones it&apos;s under the{" "}
            <strong>⋯</strong> button)
          </li>
          <li>
            Scroll down and tap <strong>Add to Home Screen</strong>
          </li>
          <li>
            Tap <strong>Add</strong>, then open Brain Fungus from your home screen
          </li>
        </ol>
      )}
    </div>
  );
}
