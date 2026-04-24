// custom hook for setlist editor logic

"use client";

import { useState } from "react";
import { Song, DeezerResult, BandCover } from "@/app/types";
import { updateSetlistAction } from "@/app/actions/setlists";
import { useDeezerSearch } from "@/app/hooks/useDeezerSearch";

interface UseSetlistEditorOptions {
  onSaveSuccess?: (name: string, songs: Song[]) => void;
}

function toPersistedSong(song: Song): Song {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    preview: song.preview,
    image: song.image,
    isCustom: song.isCustom,
    isCover: song.isCover,
  };
}

export function useSetlistEditor(options?: UseSetlistEditorOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSongs, setEditSongs] = useState<Song[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
    resetSearch,
  } = useDeezerSearch();

  const startEditing = (name: string, songs: Song[]) => {
    setEditName(name);
    setEditSongs(songs.map(toPersistedSong));
    resetSearch();
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    resetSearch();
  };

  const handleSave = async (setlistId: string) => {
    if (!editName.trim()) return;
    try {
      setIsSaving(true);
      const songsToSave = editSongs.map(toPersistedSong);
      await updateSetlistAction(setlistId, editName, songsToSave);
      options?.onSaveSuccess?.(editName.trim(), songsToSave);
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save setlist");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEditSong = (songId: string) => {
    setEditSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  const handleMoveSong = (index: number, direction: "up" | "down") => {
    setEditSongs((prev) => {
      const newSongs = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSongs.length) return prev;
      [newSongs[index], newSongs[targetIndex]] = [
        newSongs[targetIndex],
        newSongs[index],
      ];
      return newSongs;
    });
  };

  const handleAddFromSearch = (result: DeezerResult) => {
    setEditSongs((prev) => {
      if (prev.some((s) => s.id === result.id)) {
        return prev.filter((s) => s.id !== result.id);
      }
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
      return [...prev, song];
    });
  };

  const handleToggleCustomSong = (
    songId: string,
    title: string,
    duration?: number,
  ) => {
    setEditSongs((prev) => {
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

  const handleToggleCustomAlbum = (
    albumName: string,
    songs: Array<{ id: string; title: string; duration?: number }>,
  ) => {
    setEditSongs((prev) => {
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
    setEditSongs((prev) => {
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

  const isEditSongSelected = (songId: string) =>
    editSongs.some((s) => s.id === songId);

  return {
    isEditing,
    editName,
    setEditName,
    editSongs,
    isSaving,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    startEditing,
    cancelEditing,
    handleSave,
    handleRemoveEditSong,
    handleMoveSong,
    handleSearch,
    handleAddFromSearch,
    handleToggleCustomSong,
    handleToggleCustomAlbum,
    handleToggleCoverSong,
    isEditSongSelected,
  };
}
