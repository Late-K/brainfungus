"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deactivateSetlistAction,
  deleteSetlistAction,
  setActiveSetlistAction,
  updateSetlistAction,
} from "@/app/actions/setlists";
import { Band, Setlist, Song } from "@/app/types";
import { getProgress } from "@/app/lib/setlistUtils";
import { useSetlistEditor } from "@/app/hooks/useSetlistEditor";
import { useBandLearntStatus } from "@/app/hooks/useBandLearntStatus";
import { unwrapAction } from "@/app/lib/actionResult";

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
  const [memberCount, setMemberCount] = useState(0);
  const [pendingSaves, setPendingSaves] = useState(0);
  // saves run one at a time so a slow request can't overwrite a newer one
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const {
    learntMap,
    learningIds,
    togglingIds,
    handleToggleLearnt,
    handleToggleLearning,
  } = useBandLearntStatus(bandId);

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

      const [setlistRes, bandRes] = await Promise.all([
        fetch(`/api/setlists/${setlistId}`),
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

  // refetch without the loading screen, used to undo a change that failed to save
  const reloadSetlist = async () => {
    try {
      const res = await fetch(`/api/setlists/${setlistId}`);
      if (res.ok) {
        const data = await res.json();
        setSetlist(data.setlist);
      }
    } catch (err) {
      console.error("Failed to reload setlist:", err);
    }
  };

  // changes show straight away and are saved in the background
  const saveSetlist = (name: string, songs: Song[]) => {
    if (!setlistId) return Promise.resolve(false);
    setSetlist((prev) => (prev ? { ...prev, name, songs } : prev));
    setPendingSaves((count) => count + 1);

    const save = saveQueue.current.then(async () => {
      try {
        unwrapAction(await updateSetlistAction(setlistId, name, songs));
        return true;
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to save setlist");
        await reloadSetlist();
        return false;
      } finally {
        setPendingSaves((count) => count - 1);
      }
    });
    saveQueue.current = save.then(() => undefined);
    return save;
  };

  const editor = useSetlistEditor({
    songs: setlist?.songs ?? [],
    onSongsChange: (songs) => {
      if (setlist) saveSetlist(setlist.name, songs);
    },
  });

  const handleRename = async (name: string) => {
    const trimmed = name.trim();
    if (!setlist || !trimmed) return false;
    if (trimmed === setlist.name) return true;
    return saveSetlist(trimmed, setlist.songs);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this setlist?")) return;
    if (!setlistId) return;
    try {
      setIsDeleting(true);
      unwrapAction(await deleteSetlistAction(setlistId));
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
        unwrapAction(await deactivateSetlistAction(bandId, setlistId));
        setSetlist({ ...setlist, isActive: false });
      } else {
        unwrapAction(await setActiveSetlistAction(bandId, setlistId));
        setSetlist({ ...setlist, isActive: true });
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to update setlist status",
      );
    }
  };

  const totalDuration =
    setlist?.songs.reduce((sum, song) => sum + (song.duration || 0), 0) || 0;
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
    learningIds,
    togglingIds,
    totalDuration,
    progress,
    editor,
    isSaving: pendingSaves > 0,
    handleRename,
    handleDelete,
    handleToggleActive,
    handleToggleLearnt,
    handleToggleLearning,
  };
}
