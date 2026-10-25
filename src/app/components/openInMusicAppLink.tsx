"use client";

import { useMusicApp } from "@/app/components/musicAppProvider";
import { getMusicAppLabel, getMusicAppUrl } from "@/app/lib/musicAppUtils";

interface OpenInMusicAppLinkProps {
  // custom songs have no deezer id and aren't on streaming apps
  deezerTrackId?: string | null;
  title: string;
  artist?: string;
}

export default function OpenInMusicAppLink({
  deezerTrackId,
  title,
  artist,
}: OpenInMusicAppLinkProps) {
  const { musicApp } = useMusicApp();

  if (!musicApp || !deezerTrackId) return null;

  return (
    <a
      href={getMusicAppUrl(musicApp, { deezerTrackId, title, artist })}
      target="_blank"
      rel="noopener noreferrer"
      className="music-app-link"
    >
      Listen on {getMusicAppLabel(musicApp)} ↗
    </a>
  );
}
