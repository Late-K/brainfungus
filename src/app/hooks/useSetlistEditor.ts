// custom hook for adding, removing and reordering a setlist's songs.
// every change is handed to onSongsChange with the full new song list

"use client";

import { Song, DeezerResult, BandCover, ProfileLearntSong } from "@/app/types";
import {
  coverToSetlistSong,
  profileSongToSetlistSong,
} from "@/app/lib/setlistUtils";

interface UseSetlistEditorOptions {
  songs: Song[];
  onSongsChange: (songs: Song[]) => void;
}

export function useSetlistEditor({
  songs,
  onSongsChange,
}: UseSetlistEditorOptions) {
  const handleRemoveSong = (songId: string) => {
    onSongsChange(songs.filter((s) => s.id !== songId));
  };

  const handleMoveSong = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= songs.length) return;
    const newSongs = [...songs];
    [newSongs[index], newSongs[targetIndex]] = [
      newSongs[targetIndex],
      newSongs[index],
    ];
    onSongsChange(newSongs);
  };

  const toggleSong = (song: Song) => {
    if (songs.some((s) => s.id === song.id)) {
      onSongsChange(songs.filter((s) => s.id !== song.id));
    } else {
      onSongsChange([...songs, song]);
    }
  };

  const handleAddFromSearch = (result: DeezerResult) => {
    toggleSong({
      id: result.id,
      title: result.title,
      artist: result.artist,
      album: result.album,
      duration: result.duration,
      preview: result.preview,
      image: result.image,
      isCustom: false,
    });
  };

  const handleToggleCustomSong = (
    songId: string,
    title: string,
    duration?: number,
    image?: string,
  ) => {
    toggleSong({
      id: songId,
      title,
      duration: duration ?? 0,
      image,
      isCustom: true,
    });
  };

  const handleToggleCustomAlbum = (
    albumName: string,
    albumSongs: Array<{
      id: string;
      title: string;
      duration?: number;
      image?: string;
    }>,
  ) => {
    const albumSongIds = albumSongs.map((song) => song.id);
    const allSelected = albumSongIds.every((id) =>
      songs.some((song) => song.id === id),
    );

    if (allSelected) {
      onSongsChange(songs.filter((song) => !albumSongIds.includes(song.id)));
      return;
    }

    const existingIds = new Set(songs.map((song) => song.id));

    const songsToAdd: Song[] = albumSongs
      .filter((song) => !existingIds.has(song.id))
      .map((song) => ({
        id: song.id,
        title: song.title,
        album: albumName,
        duration: song.duration ?? 0,
        image: song.image,
        isCustom: true,
      }));

    onSongsChange([...songs, ...songsToAdd]);
  };

  const handleToggleCoverSong = (cover: BandCover) => {
    toggleSong(coverToSetlistSong(cover));
  };

  const handleToggleProfileSong = (song: ProfileLearntSong) => {
    toggleSong(profileSongToSetlistSong(song));
  };

  const isSongSelected = (songId: string) => songs.some((s) => s.id === songId);

  return {
    handleRemoveSong,
    handleMoveSong,
    handleAddFromSearch,
    handleToggleCustomSong,
    handleToggleCustomAlbum,
    handleToggleCoverSong,
    handleToggleProfileSong,
    isSongSelected,
  };
}
