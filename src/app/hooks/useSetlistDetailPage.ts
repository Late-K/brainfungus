"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deactivateSetlistAction,
  deleteSetlistAction,
  setActiveSetlistAction,
} from "@/app/actions/setlists";
import { addBandCoverAction } from "@/app/actions/covers";
import { BandCover, Band, Setlist, Song } from "@/app/types";
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
  const {
    learntMap,
    learningIds,
    togglingIds,
    handleToggleLearnt,
    handleToggleLearning,
  } = useBandLearntStatus(bandId);
  const [coverSongIds, setCoverSongIds] = useState<Set<string>>(new Set());
  const [addingCoverIds, setAddingCoverIds] = useState<Set<string>>(new Set());

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

      const [setlistRes, bandRes, coversRes] = await Promise.all([
        fetch(`/api/setlists/${setlistId}`),
        fetch(`/api/bands/${bandId}`),
        fetch(`/api/covers?bandId=${bandId}`),
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

      if (coversRes.ok) {
        const coversData = await coversRes.json();
        const covers: BandCover[] = coversData.covers || [];
        setCoverSongIds(new Set(covers.map((cover) => cover.songId)));
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

  // custom songs aren't covers, so only Deezer songs can be added
  const handleAddToCovers = async (song: Song) => {
    if (!bandId || song.isCustom || addingCoverIds.has(song.id)) return;
    setAddingCoverIds((prev) => new Set(prev).add(song.id));
    try {
      unwrapAction(
        await addBandCoverAction(bandId, {
          id: song.id,
          title: song.title,
          artist: song.artist || "",
          album: song.album || "",
          duration: song.duration,
          preview: song.preview,
          image: song.image,
        }),
      );
      setCoverSongIds((prev) => new Set(prev).add(song.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add cover");
    } finally {
      setAddingCoverIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
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
    coverSongIds,
    addingCoverIds,
    totalDuration,
    progress,
    editor,
    handleDelete,
    handleToggleActive,
    handleToggleLearnt,
    handleToggleLearning,
    handleAddToCovers,
  };
}
