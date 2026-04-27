"use client";

import { FormEvent, use, useCallback, useEffect, useState } from "react";
import {
  createSongAction,
  deleteSongAction,
  reorderAlbumSongsAction,
  updateSongAction,
} from "@/app/actions/songs";
import { toggleLearntSongAction } from "@/app/actions/learntSongs";
import { Band, CustomSong, LearntMap } from "@/app/types";

async function getAudioDurationSeconds(
  file: File,
): Promise<number | undefined> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number | undefined>((resolve) => {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        resolve(Number.isFinite(audio.duration) ? audio.duration : undefined);
      };
      audio.onerror = () => resolve(undefined);
      audio.src = objectUrl;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function parseApiResponse<T = Record<string, unknown>>(
  response: Response,
): Promise<{ data?: T; errorMessage?: string }> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as T & { error?: string };
    return { data: json, errorMessage: json.error };
  }

  const text = (await response.text()).trim();
  const normalized = text.toLowerCase();
  if (normalized.includes("request entity too large")) {
    return {
      errorMessage:
        "Audio file is too large. Try a smaller file and upload again.",
    };
  }
  return { errorMessage: text || undefined };
}

export function useBandSongsPage(params: Promise<{ id: string }>) {
  const { id: bandId } = use(params);
  const [band, setBand] = useState<Band | null>(null);
  const [songs, setSongs] = useState<CustomSong[]>([]);
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [newAlbum, setNewAlbum] = useState("");
  const [newAlbumIsCustom, setNewAlbumIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAlbum, setEditAlbum] = useState("");
  const [editAlbumIsCustom, setEditAlbumIsCustom] = useState(false);

  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
  const [uploadingAudioIds, setUploadingAudioIds] = useState<Set<string>>(
    new Set(),
  );

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

  const fetchLearntMap = useCallback(async () => {
    if (!bandId) return;
    try {
      const res = await fetch(`/api/learnt-songs?bandId=${bandId}`);
      if (!res.ok) return;
      const data = await res.json();
      setLearntMap(data.learntMap || {});
    } catch (err) {
      console.error("Failed to fetch learnt songs:", err);
    }
  }, [bandId]);

  const fetchSongs = useCallback(async () => {
    if (!bandId) return;
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`/api/songs?bandId=${bandId}`);
      if (!res.ok) throw new Error("Failed to fetch songs");
      const data = await res.json();
      setSongs(data.songs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load songs");
    } finally {
      setIsLoading(false);
    }
  }, [bandId]);

  useEffect(() => {
    if (!bandId) return;
    fetchSongs();
    fetchLearntMap();
  }, [bandId, fetchLearntMap, fetchSongs]);

  const handleToggleLearnt = async (songId: string) => {
    if (!bandId) return;
    setTogglingIds((prev) => new Set(prev).add(songId));
    try {
      await toggleLearntSongAction(bandId, songId);
      await fetchLearntMap();
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

  const handleAddSong = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !bandId) return;

    try {
      setIsSaving(true);
      setError("");
      const result = await createSongAction(
        bandId,
        newTitle,
        newNotes,
        newAlbum,
      );
      let createdSong: CustomSong = result.song;

      if (newAudioFile) {
        try {
          const formData = new FormData();
          const durationSeconds = await getAudioDurationSeconds(newAudioFile);
          formData.append("audio", newAudioFile);
          if (durationSeconds !== undefined) {
            formData.append("durationSeconds", String(durationSeconds));
          }

          const uploadRes = await fetch(`/api/songs/${result.song._id}/audio`, {
            method: "POST",
            body: formData,
          });
          const { data: uploadData, errorMessage } = await parseApiResponse<{
            audioUrl?: string;
            duration?: number;
            error?: string;
          }>(uploadRes);
          if (!uploadRes.ok) {
            throw new Error(errorMessage || "Audio upload failed");
          }

          if (!uploadData) {
            throw new Error("Audio upload failed");
          }

          createdSong = {
            ...createdSong,
            audioUrl: uploadData.audioUrl,
            duration:
              typeof uploadData.duration === "number"
                ? uploadData.duration
                : createdSong.duration,
          };
        } catch (uploadErr) {
          setError(
            uploadErr instanceof Error
              ? `${uploadErr.message}. Song was created without audio.`
              : "Song created, but audio upload failed.",
          );
        }
      }

      setSongs((prev) => [createdSong, ...prev]);
      setNewTitle("");
      setNewNotes("");
      setNewAudioFile(null);
      setNewAlbum("");
      setNewAlbumIsCustom(false);
      setShowForm(false);
      if (result.song.album) {
        setExpandedAlbums((prev) => new Set(prev).add(result.song.album!));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create song");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (songId: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;
    try {
      await deleteSongAction(songId);
      setSongs(songs.filter((s) => s._id !== songId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete song");
    }
  };

  const startEditing = (song: CustomSong) => {
    setEditingId(song._id);
    setEditTitle(song.title);
    setEditNotes(song.notes || "");
    setEditAlbum(song.album || "");
    setEditAlbumIsCustom(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    try {
      await updateSongAction(editingId, {
        title: editTitle,
        notes: editNotes,
        album: editAlbum,
      });
      setSongs(
        songs.map((s) =>
          s._id === editingId
            ? { ...s, title: editTitle, notes: editNotes, album: editAlbum }
            : s,
        ),
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update song");
    }
  };

  const handleUploadAudio = async (songId: string, file: File) => {
    setUploadingAudioIds((prev) => new Set(prev).add(songId));
    try {
      const formData = new FormData();
      const durationSeconds = await getAudioDurationSeconds(file);
      formData.append("audio", file);
      if (durationSeconds !== undefined) {
        formData.append("durationSeconds", String(durationSeconds));
      }
      const res = await fetch(`/api/songs/${songId}/audio`, {
        method: "POST",
        body: formData,
      });
      const { data, errorMessage } = await parseApiResponse<{
        audioUrl?: string;
        duration?: number;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(errorMessage || "Upload failed");
      if (!data) throw new Error("Upload failed");
      setSongs((prev) =>
        prev.map((s) =>
          s._id === songId
            ? {
                ...s,
                audioUrl: data.audioUrl,
                duration:
                  typeof data.duration === "number"
                    ? data.duration
                    : s.duration,
              }
            : s,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload audio");
    } finally {
      setUploadingAudioIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleDeleteAudio = async (songId: string) => {
    setUploadingAudioIds((prev) => new Set(prev).add(songId));
    try {
      const res = await fetch(`/api/songs/${songId}/audio`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove audio");
      setSongs((prev) =>
        prev.map((s) => (s._id === songId ? { ...s, audioUrl: undefined } : s)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove audio");
    } finally {
      setUploadingAudioIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const toggleAlbum = (albumName: string) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumName)) next.delete(albumName);
      else next.add(albumName);
      return next;
    });
  };

  const handleMoveSong = async (
    album: string,
    albumSongs: CustomSong[],
    index: number,
    direction: "up" | "down",
  ) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= albumSongs.length) return;

    const reordered = [...albumSongs];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    const reorderedIds = new Set(reordered.map((s) => s._id));
    const otherSongs = songs.filter((s) => !reorderedIds.has(s._id));
    const updatedReordered = reordered.map((s, i) => ({ ...s, order: i }));
    setSongs([...otherSongs, ...updatedReordered]);

    try {
      await reorderAlbumSongsAction(
        bandId!,
        album,
        reordered.map((s) => s._id),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reorder");
      fetchSongs();
    }
  };

  const groupedSongs = songs.reduce<Record<string, CustomSong[]>>(
    (acc, song) => {
      const key = song.album || "";
      if (!acc[key]) acc[key] = [];
      acc[key].push(song);
      return acc;
    },
    {},
  );

  for (const key of Object.keys(groupedSongs)) {
    groupedSongs[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const looseSongs = groupedSongs[""] || [];
  const albums = Object.entries(groupedSongs).filter(([key]) => key !== "");
  const existingAlbums = albums.map(([name]) => name);

  return {
    bandId,
    band,
    songs,
    learntMap,
    togglingIds,
    isLoading,
    error,
    showForm,
    setShowForm,
    newTitle,
    setNewTitle,
    newNotes,
    setNewNotes,
    newAudioFile,
    setNewAudioFile,
    newAlbum,
    setNewAlbum,
    newAlbumIsCustom,
    setNewAlbumIsCustom,
    isSaving,
    editingId,
    editTitle,
    setEditTitle,
    editNotes,
    setEditNotes,
    editAlbum,
    setEditAlbum,
    editAlbumIsCustom,
    setEditAlbumIsCustom,
    expandedAlbums,
    albums,
    looseSongs,
    existingAlbums,
    uploadingAudioIds,
    handleUploadAudio,
    handleDeleteAudio,
    handleToggleLearnt,
    handleAddSong,
    handleDelete,
    startEditing,
    cancelEditing,
    handleSaveEdit,
    toggleAlbum,
    handleMoveSong,
  };
}
