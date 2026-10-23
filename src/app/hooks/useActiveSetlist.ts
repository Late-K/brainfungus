"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addSongToActiveSetlistAction,
  removeSongFromActiveSetlistAction,
} from "@/app/actions/setlists";
import { Setlist, Song } from "@/app/types";

// tracks the band's active setlist so songs can be added to it from other lists
export function useActiveSetlist(bandId: string | undefined) {
  const [activeSetlist, setActiveSetlist] = useState<Setlist | null>(null);
  const [setlistSongIds, setSetlistSongIds] = useState<Set<string>>(new Set());
  const [togglingSetlistIds, setTogglingSetlistIds] = useState<Set<string>>(
    new Set(),
  );

  const fetchActiveSetlist = useCallback(
    async (signal?: AbortSignal) => {
      if (!bandId) return;
      try {
        const res = await fetch(`/api/setlists?bandId=${bandId}`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        if (signal?.aborted) return;
        const setlists: Setlist[] = data.setlists || [];
        const active = setlists.find((s) => s.isActive) || null;
        setActiveSetlist(active);
        setSetlistSongIds(
          new Set((active?.songs || []).map((song) => String(song.id))),
        );
      } catch {
        // keep the list usable even if the setlist fails to load
      }
    },
    [bandId],
  );

  useEffect(() => {
    if (!bandId) return;
    const controller = new AbortController();
    fetchActiveSetlist(controller.signal);
    return () => controller.abort();
  }, [bandId, fetchActiveSetlist]);

  const isInActiveSetlist = (songId: string) => setlistSongIds.has(songId);

  const handleToggleActiveSetlist = async (song: Song) => {
    if (!bandId || !activeSetlist || togglingSetlistIds.has(song.id)) return;

    const songId = song.id;
    const isInSetlist = setlistSongIds.has(songId);

    setTogglingSetlistIds((prev) => new Set(prev).add(songId));
    try {
      if (isInSetlist) {
        await removeSongFromActiveSetlistAction(bandId, songId);
        setSetlistSongIds((prev) => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
      } else {
        await addSongToActiveSetlistAction(bandId, song);
        setSetlistSongIds((prev) => new Set(prev).add(songId));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update setlist");
      await fetchActiveSetlist();
    } finally {
      setTogglingSetlistIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  return {
    activeSetlist,
    togglingSetlistIds,
    isInActiveSetlist,
    handleToggleActiveSetlist,
  };
}
