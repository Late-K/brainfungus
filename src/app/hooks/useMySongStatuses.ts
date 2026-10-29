"use client";

import { useMemo, useState } from "react";
import {
  addPersonalLearningSongAction,
  addPersonalLearntSongAction,
  moveSongAction,
  removePersonalLearningSongAction,
  removePersonalLearntSongAction,
} from "@/app/actions/learntSongs";
import { ProfileLearntSong, PublicUserProfile } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

// where one of the current user's songs is, null when it's on neither list
export type MySongStatus = "learnt" | "learning" | null;

// the current user's own learnt / learning status for songs on someone else's
// profile, and the toggles to change it
export function useMySongStatuses(data: PublicUserProfile | null) {
  // songs moved between the current user's lists on this page since it loaded
  const [statusChanges, setStatusChanges] = useState<
    Record<string, MySongStatus>
  >({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const myStatuses = useMemo(() => {
    const statuses: Record<string, MySongStatus> = {};
    data?.myLearningSongIds.forEach((id) => (statuses[id] = "learning"));
    data?.mySongs.forEach((s) => (statuses[s.songId] = "learnt"));
    return { ...statuses, ...statusChanges };
  }, [data, statusChanges]);
  const getMyStatus = (songId: string) => myStatuses[songId] ?? null;

  const mySongIds = useMemo(
    () =>
      new Set(
        Object.keys(myStatuses).filter((id) => myStatuses[id] === "learnt"),
      ),
    [myStatuses],
  );

  // same Learnt / Learning toggles as the band song lists. a song already on
  // the user's other list is moved across, keeping what it was saved with
  const handleToggle = async (
    song: ProfileLearntSong,
    target: "learnt" | "learning",
  ) => {
    if (savingIds.has(song.songId)) return;
    const status = getMyStatus(song.songId);

    setSavingIds((prev) => new Set(prev).add(song.songId));
    try {
      if (status === target) {
        unwrapAction(
          target === "learnt"
            ? await removePersonalLearntSongAction(song.songId)
            : await removePersonalLearningSongAction(song.songId),
        );
      } else if (status) {
        unwrapAction(await moveSongAction(song.songId, target));
      } else {
        const input = {
          id: song.songId,
          title: song.title,
          artist: song.artist ?? "",
          album: song.album ?? "",
          duration: song.duration ?? 0,
          preview: song.preview,
          image: song.image,
        };
        unwrapAction(
          target === "learnt"
            ? await addPersonalLearntSongAction(input)
            : await addPersonalLearningSongAction(input),
        );
      }
      setStatusChanges((prev) => ({
        ...prev,
        [song.songId]: status === target ? null : target,
      }));
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : `Failed to update ${target} status`,
      );
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(song.songId);
        return next;
      });
    }
  };

  return { getMyStatus, mySongIds, savingIds, handleToggle };
}
