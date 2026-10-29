"use client";

import { FormEvent, use, useCallback, useEffect, useState } from "react";
import {
  createSongAction,
  deleteAlbumImageAction,
  deleteSongAction,
  deleteAudioAction,
  deleteSongImageAction,
  reorderAlbumSongsAction,
  updateSongAction,
  uploadAlbumImageAction,
  uploadAudioAction,
  uploadSongImageAction,
} from "@/app/actions/songs";
import { useBandLearntStatus } from "@/app/hooks/useBandLearntStatus";
import {
  compareByDate,
  compareByKnownCount,
  safeTimestamp,
} from "@/app/lib/sortUtils";
import { Band, CustomSong } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

type KnownSongSort = "newest" | "oldest" | "mostKnown" | "leastKnown";

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

function imageFormData(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  return formData;
}

function withoutId(ids: Set<string>, id: string) {
  const next = new Set(ids);
  next.delete(id);
  return next;
}

export function useBandSongsPage(params: Promise<{ id: string }>) {
  const { id: bandId } = use(params);
  const [band, setBand] = useState<Band | null>(null);
  const [songs, setSongs] = useState<CustomSong[]>([]);
  const {
    learntMap,
    learningIds,
    togglingIds,
    handleToggleLearnt,
    handleToggleLearning,
  } = useBandLearntStatus(bandId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newAlbumImageFile, setNewAlbumImageFile] = useState<File | null>(null);
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
  const [uploadingImageIds, setUploadingImageIds] = useState<Set<string>>(
    new Set(),
  );
  const [uploadingAlbumImages, setUploadingAlbumImages] = useState<Set<string>>(
    new Set(),
  );
  // album images changed since the songs were loaded, null when removed.
  // covers albums no song is in yet, e.g. one just typed in the edit form
  const [albumImageOverrides, setAlbumImageOverrides] = useState<
    Record<string, string | null>
  >({});
  const [sortBy, setSortBy] = useState<KnownSongSort>("newest");

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
  }, [bandId, fetchSongs]);

  // every song in an album carries the album image, so any of them will do
  const getAlbumImage = (albumName?: string) => {
    if (!albumName) return undefined;
    if (albumName in albumImageOverrides) {
      return albumImageOverrides[albumName] ?? undefined;
    }
    return songs.find((s) => s.album === albumName && s.albumImage)?.albumImage;
  };

  const setAlbumImage = (albumName: string, albumImage?: string) => {
    setAlbumImageOverrides((prev) => ({
      ...prev,
      [albumName]: albumImage ?? null,
    }));
    setSongs((prev) =>
      prev.map((s) => (s.album === albumName ? { ...s, albumImage } : s)),
    );
  };

  const handleAddSong = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !bandId) return;

    try {
      setIsSaving(true);
      setError("");
      const result = unwrapAction(
        await createSongAction(bandId, newTitle, newNotes, newAlbum),
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

          const uploadData = unwrapAction(
            await uploadAudioAction(result.song._id, formData),
          );

          createdSong = {
            ...createdSong,
            audioUrl: `${uploadData.audioUrl}?v=${Date.now()}`,
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

      if (newImageFile) {
        try {
          const { image } = unwrapAction(
            await uploadSongImageAction(
              result.song._id,
              imageFormData(newImageFile),
            ),
          );
          createdSong = { ...createdSong, image };
        } catch (uploadErr) {
          setError(
            uploadErr instanceof Error
              ? `${uploadErr.message}. Song was created without its image.`
              : "Song created, but image upload failed.",
          );
        }
      }

      const album = result.song.album;
      let albumImage = getAlbumImage(album);
      if (newAlbumImageFile && album) {
        try {
          ({ image: albumImage } = unwrapAction(
            await uploadAlbumImageAction(
              bandId,
              album,
              imageFormData(newAlbumImageFile),
            ),
          ));
          setAlbumImage(album, albumImage);
        } catch (uploadErr) {
          setError(
            uploadErr instanceof Error
              ? `${uploadErr.message}. Song was created without the album image.`
              : "Song created, but album image upload failed.",
          );
        }
      }
      createdSong = { ...createdSong, albumImage };

      setSongs((prev) => [
        createdSong,
        ...prev.map((s) =>
          album && s.album === album ? { ...s, albumImage } : s,
        ),
      ]);
      setNewTitle("");
      setNewNotes("");
      setNewAudioFile(null);
      setNewImageFile(null);
      setNewAlbumImageFile(null);
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
      unwrapAction(await deleteSongAction(songId));
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
      unwrapAction(
        await updateSongAction(editingId, {
          title: editTitle,
          notes: editNotes,
          album: editAlbum,
        }),
      );
      // moving to another album picks up that album's image
      const albumImage = getAlbumImage(editAlbum);
      setSongs(
        songs.map((s) =>
          s._id === editingId
            ? {
                ...s,
                title: editTitle,
                notes: editNotes,
                album: editAlbum,
                albumImage,
              }
            : s,
        ),
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update song");
    }
  };

  const handleUploadImage = async (songId: string, file: File) => {
    setUploadingImageIds((prev) => new Set(prev).add(songId));
    try {
      const { image } = unwrapAction(
        await uploadSongImageAction(songId, imageFormData(file)),
      );
      setSongs((prev) =>
        prev.map((s) => (s._id === songId ? { ...s, image } : s)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImageIds((prev) => withoutId(prev, songId));
    }
  };

  const handleDeleteImage = async (songId: string) => {
    setUploadingImageIds((prev) => new Set(prev).add(songId));
    try {
      unwrapAction(await deleteSongImageAction(songId));
      setSongs((prev) =>
        prev.map((s) => (s._id === songId ? { ...s, image: undefined } : s)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setUploadingImageIds((prev) => withoutId(prev, songId));
    }
  };

  // album images are edited from a song's edit form and apply to the whole album
  const handleUploadAlbumImage = async (albumName: string, file: File) => {
    if (!bandId || !albumName) return;
    setUploadingAlbumImages((prev) => new Set(prev).add(albumName));
    try {
      const { image } = unwrapAction(
        await uploadAlbumImageAction(bandId, albumName, imageFormData(file)),
      );
      setAlbumImage(albumName, image);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingAlbumImages((prev) => withoutId(prev, albumName));
    }
  };

  const handleDeleteAlbumImage = async (albumName: string) => {
    if (!bandId || !albumName) return;
    setUploadingAlbumImages((prev) => new Set(prev).add(albumName));
    try {
      unwrapAction(await deleteAlbumImageAction(bandId, albumName));
      setAlbumImage(albumName, undefined);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setUploadingAlbumImages((prev) => withoutId(prev, albumName));
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
      const data = unwrapAction(await uploadAudioAction(songId, formData));
      setSongs((prev) =>
        prev.map((s) =>
          s._id === songId
            ? {
                ...s,
                audioUrl: `${data.audioUrl}?v=${Date.now()}`,
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
      unwrapAction(await deleteAudioAction(songId));
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
      unwrapAction(
        await reorderAlbumSongsAction(
          bandId!,
          reordered.map((s) => s._id),
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reorder");
      fetchSongs();
    }
  };

  const getSongTimestamp = (song: CustomSong) => {
    return safeTimestamp(song.createdAt);
  };

  const getKnownCount = (song: CustomSong) => learntMap[song._id]?.length ?? 0;

  const compareSongs = (a: CustomSong, b: CustomSong) => {
    if (sortBy === "newest") {
      return compareByDate(getSongTimestamp(a), getSongTimestamp(b), "newest");
    }
    if (sortBy === "oldest") {
      return compareByDate(getSongTimestamp(a), getSongTimestamp(b), "oldest");
    }
    if (sortBy === "mostKnown") {
      const knownDiff = compareByKnownCount(
        getKnownCount(a),
        getKnownCount(b),
        "mostKnown",
      );
      if (knownDiff !== 0) return knownDiff;
      return compareByDate(getSongTimestamp(a), getSongTimestamp(b), "newest");
    }

    const knownDiff = compareByKnownCount(
      getKnownCount(a),
      getKnownCount(b),
      "leastKnown",
    );
    if (knownDiff !== 0) return knownDiff;
    return compareByDate(getSongTimestamp(a), getSongTimestamp(b), "newest");
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
    if (key === "") {
      groupedSongs[key].sort(compareSongs);
    } else {
      groupedSongs[key].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return getSongTimestamp(a) - getSongTimestamp(b);
      });
    }
  }

  const looseSongs = groupedSongs[""] || [];
  const albums = Object.entries(groupedSongs)
    .filter(([key]) => key !== "")
    .sort(([, songsA], [, songsB]) => {
      if (sortBy === "newest") {
        const newestA = Math.max(...songsA.map(getSongTimestamp));
        const newestB = Math.max(...songsB.map(getSongTimestamp));
        return compareByDate(newestA, newestB, "newest");
      }

      if (sortBy === "oldest") {
        const oldestA = Math.min(...songsA.map(getSongTimestamp));
        const oldestB = Math.min(...songsB.map(getSongTimestamp));
        return compareByDate(oldestA, oldestB, "oldest");
      }

      const knownA = songsA.reduce((sum, song) => sum + getKnownCount(song), 0);
      const knownB = songsB.reduce((sum, song) => sum + getKnownCount(song), 0);

      if (sortBy === "mostKnown") {
        const knownDiff = compareByKnownCount(knownA, knownB, "mostKnown");
        if (knownDiff !== 0) return knownDiff;
        const newestA = Math.max(...songsA.map(getSongTimestamp));
        const newestB = Math.max(...songsB.map(getSongTimestamp));
        return compareByDate(newestA, newestB, "newest");
      }

      const knownDiff = compareByKnownCount(knownA, knownB, "leastKnown");
      if (knownDiff !== 0) return knownDiff;
      const newestA = Math.max(...songsA.map(getSongTimestamp));
      const newestB = Math.max(...songsB.map(getSongTimestamp));
      return compareByDate(newestA, newestB, "newest");
    });
  const existingAlbums = albums.map(([name]) => name);

  return {
    bandId,
    band,
    songs,
    learntMap,
    learningIds,
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
    newImageFile,
    setNewImageFile,
    newAlbumImageFile,
    setNewAlbumImageFile,
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
    uploadingImageIds,
    uploadingAlbumImages,
    getAlbumImage,
    sortBy,
    setSortBy,
    handleUploadAudio,
    handleDeleteAudio,
    handleUploadImage,
    handleDeleteImage,
    handleUploadAlbumImage,
    handleDeleteAlbumImage,
    handleToggleLearnt,
    handleToggleLearning,
    handleAddSong,
    handleDelete,
    startEditing,
    cancelEditing,
    handleSaveEdit,
    toggleAlbum,
    handleMoveSong,
  };
}
