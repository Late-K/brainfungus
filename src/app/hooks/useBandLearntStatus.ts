"use client";

import { useCallback, useEffect, useState } from "react";
import {
  toggleLearningSongAction,
  toggleLearntSongAction,
} from "@/app/actions/learntSongs";
import { LearntMap } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

// who in the band has learnt each song, which songs the current user is
// learning, and the Learnt / Learning toggles shared by the band song lists
export function useBandLearntStatus(bandId: string | undefined) {
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchLearntStatus = useCallback(
    async (signal?: AbortSignal) => {
      if (!bandId) return;
      try {
        const res = await fetch(`/api/learnt-songs?bandId=${bandId}`, {
          signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (signal?.aborted) return;
        setLearntMap(data.learntMap || {});
        setLearningIds(new Set(data.learningIds || []));
      } catch (err) {
        if (signal?.aborted) return;
        // keep the songs visible even if learnt stats fail
        console.error("Failed to fetch learnt songs:", err);
      }
    },
    [bandId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchLearntStatus(controller.signal);
    return () => controller.abort();
  }, [fetchLearntStatus]);

  const runToggle = async (
    songId: string,
    toggle: () => Promise<unknown>,
    failureMessage: string,
  ) => {
    if (!bandId || togglingIds.has(songId)) return;
    setTogglingIds((prev) => new Set(prev).add(songId));
    try {
      await toggle();
      await fetchLearntStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : failureMessage);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleToggleLearnt = (songId: string) =>
    runToggle(
      songId,
      async () => unwrapAction(await toggleLearntSongAction(bandId!, songId)),
      "Failed to toggle learnt status",
    );

  const handleToggleLearning = (songId: string) =>
    runToggle(
      songId,
      async () =>
        unwrapAction(await toggleLearningSongAction(bandId!, songId)),
      "Failed to toggle learning status",
    );

  return {
    learntMap,
    learningIds,
    togglingIds,
    handleToggleLearnt,
    handleToggleLearning,
  };
}
