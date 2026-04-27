"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deactivateSetlistAction,
  deleteSetlistAction,
  setActiveSetlistAction,
} from "@/app/actions/setlists";
import { toggleLearntSongAction } from "@/app/actions/learntSongs";
import { Band, LearntMap, Setlist } from "@/app/types";
import { getProgress } from "@/app/lib/setlistUtils";
import { useSetlistEditor } from "@/app/hooks/useSetlistEditor";

export function useSetlistDetailPage(
  params: Promise<{ id: string; setlistId: string }>,
) {
  const router = useRouter();

  const { id: bandId, setlistId } = use(params);
  const [band, setBand] = useState<Band | null>(null);
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [memberCount, setMemberCount] = useState(0);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const editor = useSetlistEditor({
    onSaveSuccess: (name, songs) => {
      setSetlist((prev) => (prev ? { ...prev, name, songs } : prev));
    },
  });

  useEffect(() => {
    async function fetchBand() {
      try {
        const res = await fetch(`/api/bands/${bandId}`);
        if (res.ok) {
          const data = await res.json();
          setBand(data.band);
        }
      } catch (err) {
        console.error("Failed to fetch band:", err);
      }
    }
    fetchBand();
  }, [bandId]);

  const fetchData = useCallback(async () => {
    if (!setlistId || !bandId) return;
    try {
      setIsLoading(true);
      setError("");

      const [setlistRes, learntRes, bandRes] = await Promise.all([
        fetch(`/api/setlists/${setlistId}`),
        fetch(`/api/learnt-songs?bandId=${bandId}`),
        fetch(`/api/bands/${bandId}`),
      ]);

      if (!setlistRes.ok) {
        throw new Error(
          setlistRes.status === 404
            ? "Setlist not found"
            : "Failed to fetch setlist",
        );
      }

      const setlistData = await setlistRes.json();
      setSetlist(setlistData.setlist);

      if (learntRes.ok) {
        const learntData = await learntRes.json();
        setLearntMap(learntData.learntMap || {});
      }

      if (bandRes.ok) {
        const bandData = await bandRes.json();
        setMemberCount(bandData.band?.members?.length || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setlist");
    } finally {
      setIsLoading(false);
    }
  }, [setlistId, bandId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this setlist?")) return;
    if (!setlistId) return;
    try {
      setIsDeleting(true);
      await deleteSetlistAction(setlistId);
      router.push(`/bands/${bandId}/setlists`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete setlist");
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!bandId || !setlistId || !setlist) return;
    try {
      if (setlist.isActive) {
        await deactivateSetlistAction(bandId, setlistId);
        setSetlist({ ...setlist, isActive: false });
      } else {
        await setActiveSetlistAction(bandId, setlistId);
        setSetlist({ ...setlist, isActive: true });
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to update setlist status",
      );
    }
  };

  const handleToggleLearnt = async (songId: string) => {
    if (!bandId) return;
    setTogglingIds((prev) => new Set(prev).add(songId));
    try {
      await toggleLearntSongAction(bandId, songId);
      const learntRes = await fetch(`/api/learnt-songs?bandId=${bandId}`);
      if (learntRes.ok) {
        const learntData = await learntRes.json();
        setLearntMap(learntData.learntMap || {});
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to toggle learnt status",
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const totalDuration =
    setlist?.songs.reduce((sum, song) => sum + song.duration, 0) || 0;
  const progress = setlist ? getProgress(setlist, learntMap, memberCount) : 0;

  return {
    bandId,
    band,
    setlistId,
    setlist,
    isLoading,
    error,
    isDeleting,
    learntMap,
    togglingIds,
    totalDuration,
    progress,
    editor,
    handleDelete,
    handleToggleActive,
    handleToggleLearnt,
  };
}
