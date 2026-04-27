"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { createSetlistAction } from "@/app/actions/setlists";
import { DeezerResult, Song, BandCover } from "@/app/types";
import { useDeezerSearch } from "@/app/hooks/useDeezerSearch";

export function useCreateSetlistPage(params: Promise<{ id: string }>) {
  const router = useRouter();

  const { id: bandId } = use(params);
  const [setlistName, setSetlistName] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
  } = useDeezerSearch();

  const handleAddSong = (result: DeezerResult) => {
    if (selectedSongs.some((s) => s.id === result.id)) {
      setSelectedSongs(selectedSongs.filter((s) => s.id !== result.id));
    } else {
      const song: Song = {
        id: result.id,
        title: result.title,
        artist: result.artist,
        album: result.album,
        duration: result.duration,
        preview: result.preview,
        image: result.image,
        isCustom: false,
      };
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleToggleCustomSong = (
    songId: string,
    title: string,
    duration?: number,
  ) => {
    setSelectedSongs((prev) => {
      if (prev.some((s) => s.id === songId)) {
        return prev.filter((s) => s.id !== songId);
      }

      const song: Song = {
        id: songId,
        title,
        duration: duration ?? 0,
        isCustom: true,
      };

      return [...prev, song];
    });
  };

  const handleCreateSetlist = async () => {
    if (!setlistName.trim()) {
      setError("Setlist name is required");
      return;
    }

    if (!bandId) {
      setError("Band ID is missing");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const songsToSave = selectedSongs.map(
        ({ audioUrl: _audioUrl, ...song }) => song,
      );
      await createSetlistAction(bandId, setlistName, songsToSave);

      router.push(`/bands/${bandId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create setlist");
    } finally {
      setIsSaving(false);
    }
  };

  const isSongSelected = (songId: string) =>
    selectedSongs.some((s) => s.id === songId);

  const handleMoveSong = (index: number, direction: "up" | "down") => {
    setSelectedSongs((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleRemoveSelectedSong = (songId: string) => {
    setSelectedSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  const handleToggleCustomAlbum = (
    albumName: string,
    songs: Array<{ id: string; title: string; duration?: number }>,
  ) => {
    setSelectedSongs((prev) => {
      const albumSongIds = songs.map((song) => song.id);
      const allSelected = albumSongIds.every((id) =>
        prev.some((song) => song.id === id),
      );

      if (allSelected) {
        return prev.filter((song) => !albumSongIds.includes(song.id));
      }

      const existingIds = new Set(prev.map((song) => song.id));

      const songsToAdd: Song[] = songs
        .filter((song) => !existingIds.has(song.id))
        .map((song) => ({
          id: song.id,
          title: song.title,
          album: albumName,
          duration: song.duration ?? 0,
          isCustom: true,
        }));

      return [...prev, ...songsToAdd];
    });
  };

  const handleToggleCoverSong = (cover: BandCover) => {
    setSelectedSongs((prev) => {
      if (prev.some((song) => song.id === cover.songId)) {
        return prev.filter((song) => song.id !== cover.songId);
      }

      const song: Song = {
        id: cover.songId,
        title: cover.title,
        artist: cover.artist,
        album: cover.album,
        duration: cover.duration ?? 0,
        preview: cover.preview,
        image: cover.image,
        isCover: true,
      };

      return [...prev, song];
    });
  };

  return {
    bandId,
    setlistName,
    setSetlistName,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedSongs,
    isSearching,
    isSaving,
    error,
    searchError,
    handleSearch,
    handleAddSong,
    handleToggleCustomSong,
    handleCreateSetlist,
    isSongSelected,
    handleMoveSong,
    handleRemoveSelectedSong,
    handleToggleCustomAlbum,
    handleToggleCoverSong,
    handleCancel: () => router.push(`/bands/${bandId}/setlists`),
  };
}
