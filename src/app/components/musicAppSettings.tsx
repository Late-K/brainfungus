"use client";

// lets the user pick the streaming app songs open in for full playback

import { useMusicApp } from "@/app/components/musicAppProvider";
import { getMusicAppLabel, MUSIC_APPS } from "@/app/lib/musicAppUtils";
import { MusicApp } from "@/app/types";

const options: { value: MusicApp | null; label: string }[] = [
  ...MUSIC_APPS,
  { value: null, label: "None" },
];

export default function MusicAppSettings() {
  const { musicApp, isLoading, setMusicApp } = useMusicApp();

  if (isLoading) return null;

  return (
    <div className="setting-block">
      <span className="setting-text">
        <span className="setting-label">Listen to full songs on</span>
        <span className="setting-hint">
          {musicApp
            ? `Songs get a link to open them in ${getMusicAppLabel(musicApp)} when you want more than the preview.`
            : "Pick your music app to get a link on songs for listening to the full track."}
        </span>
      </span>
      <div className="choice-chips" role="radiogroup">
        {options.map(({ value, label }) => {
          const selected = musicApp === value;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`choice-chip ${selected ? "choice-chip-active" : ""}`}
              onClick={() => setMusicApp(value)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
