// custom hook for setlist editor logic

"use client";

import { useState } from "react";
import { Song, DeezerResult } from "@/app/types";
import { updateSetlistAction } from "@/app/actions/setlists";

interface UseSetlistEditorOptions {
  onSaveSuccess?: (name: string, songs: Song[]) => void;
}

export function useSetlistEditor(options?: UseSetlistEditorOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSongs, setEditSongs] = useState<Song[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DeezerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const startEditing = (name: string, songs: Song[]) => {
    setEditName(name);
    setEditSongs([...songs]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  const handleSave = async (setlistId: string) => {
    if (!editName.trim()) return;
    try {
      setIsSaving(true);
      await updateSetlistAction(setlistId, editName, editSongs);
      options?.onSaveSuccess?.(editName.trim(), editSongs);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setIsSearching(true);
      setSearchError("");
      setSearchResults([]);
      const res = await fetch(
        `/api/deezer/search?q=${encodeURIComponent(searchQuery)}&type=track`,
      );
      if (!res.ok) throw new Error("Failed to search songs");
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Failed to search songs",
      );
    } finally {
      setIsSearching(false);
    }
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

  const handleToggleCustomSong = (songId: string, title: string) => {
    setEditSongs((prev) => {
      if (prev.some((s) => s.id === songId)) {
        return prev.filter((s) => s.id !== songId);
      }
      const song: Song = {
        id: songId,
        title,
        duration: 0,
        isCustom: true,
      };
      return [...prev, song];
    });
  };

  const handleToggleCustomAlbum = (
    albumName: string,
    songs: Array<{ id: string; title: string }>,
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
          duration: 0,
          isCustom: true,
        }));

      return [...prev, ...songsToAdd];
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
    isEditSongSelected,
  };
}
