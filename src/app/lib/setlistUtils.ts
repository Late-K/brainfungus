// utility functions for setlist

import { Setlist, LearntMap } from "@/app/types";

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

// check if current user has learnt a song
export function currentUserLearnt(
  songId: string,
  learntMap: LearntMap,
  userName: string | null | undefined,
): boolean {
  if (!userName) return false;
  const learners = learntMap[String(songId)] || [];
  return learners.some((l) => l.userName === userName);
}
