// links for opening a song in the user's preferred streaming app

import { MusicApp } from "@/app/types";

export const MUSIC_APPS: { value: MusicApp; label: string }[] = [
  { value: "spotify", label: "Spotify" },
  { value: "youtubeMusic", label: "YouTube Music" },
  { value: "deezer", label: "Deezer" },
];

export function isMusicApp(value: unknown): value is MusicApp {
  return MUSIC_APPS.some((app) => app.value === value);
}

export function getMusicAppLabel(app: MusicApp) {
  return MUSIC_APPS.find((option) => option.value === app)?.label ?? app;
}

interface MusicAppTrack {
  deezerTrackId: string;
  title: string;
  artist?: string;
}

// songs come from deezer so that's the only app with an exact track link,
// the others get a search for "artist title". these are universal links, so
// on phones they open the installed app instead of the website
export function getMusicAppUrl(app: MusicApp, track: MusicAppTrack) {
  const query = [track.artist, track.title].filter(Boolean).join(" ");

  switch (app) {
    case "deezer":
      return `https://www.deezer.com/track/${encodeURIComponent(track.deezerTrackId)}`;
    case "spotify":
      return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    case "youtubeMusic":
      return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
  }
}
