// utility functions for setlist

import { Setlist, LearntMap, Song } from "@/app/types";

// convert a Song to the minimal format needed for storing in setlist
export function toSetlistSong(song: Song): Partial<Song> {
  if (song.isCustom) {
    return { id: String(song.id ?? ""), isCustom: true };
  }
  return {
    id: String(song.id ?? ""),
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    preview: song.preview,
    image: song.image,
    isCover: song.isCover,
  };
}

// format seconds into mm:ss
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// calculate overall progress for a setlist based on learntMap and member count for progress bar
export function getProgress(
  setlist: Setlist,
  learntMap: LearntMap,
  memberCount: number,
): number {
  if (setlist.songs.length === 0 || memberCount === 0) return 0;
  const totalNeeded = setlist.songs.length * memberCount;
  let totalLearnt = 0;
  for (const song of setlist.songs) {
    totalLearnt += (learntMap[String(song.id)] || []).length;
  }
  return Math.round((totalLearnt / totalNeeded) * 100);
}

// check if current user has learnt a song — matched by email (unique) not display name
export function currentUserLearnt(
  songId: string,
  learntMap: LearntMap,
  userEmail: string | null | undefined,
): boolean {
  if (!userEmail) return false;
  const learners = learntMap[String(songId)] || [];
  return learners.some((l) => l.userEmail === userEmail);
}
