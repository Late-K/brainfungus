"use client";

import { Song, DeezerResult, BandCover, ProfileLearntSong } from "@/app/types";
import CustomSongPicker from "@/app/components/songs/customSongPicker";
import CoverPicker from "@/app/components/covers/coverPicker";
import ProfileSongPicker from "@/app/components/setlists/profileSongPicker";
import DeezerSearch from "@/app/components/songs/deezerSearch";

interface SetlistSongPickersProps {
  bandId: string;
  collapsible?: boolean;
  selectedSongs: Song[];
  onAddFromSearch: (result: DeezerResult) => void;
  onToggleCustomSong: (
    songId: string,
    title: string,
    duration?: number,
    image?: string,
  ) => void;
  onToggleCustomAlbum?: (
    albumName: string,
    songs: Array<{
      id: string;
      title: string;
      duration?: number;
      image?: string;
    }>,
  ) => void;
  onToggleCoverSong: (cover: BandCover) => void;
  onToggleProfileSong: (song: ProfileLearntSong) => void;
  isSongSelected: (songId: string) => boolean;
}

// every source a setlist song can be picked from - each toggles the song in or out
export default function SetlistSongPickers({
  bandId,
  collapsible = false,
  selectedSongs,
  onAddFromSearch,
  onToggleCustomSong,
  onToggleCustomAlbum,
  onToggleCoverSong,
  onToggleProfileSong,
  isSongSelected,
}: SetlistSongPickersProps) {
  return (
    <>
      <CustomSongPicker
        bandId={bandId}
        collapsible={collapsible}
        defaultOpen={!collapsible}
        selectedSongs={selectedSongs}
        onToggleSong={onToggleCustomSong}
        onToggleAlbum={onToggleCustomAlbum}
      />

      <CoverPicker
        bandId={bandId}
        collapsible={collapsible}
        defaultOpen={!collapsible}
        selectedSongs={selectedSongs}
        onToggleCover={onToggleCoverSong}
      />

      <ProfileSongPicker
        bandId={bandId}
        collapsible={collapsible}
        defaultOpen={!collapsible}
        selectedSongs={selectedSongs}
        onToggleSong={onToggleProfileSong}
      />

      {/* pinned on the setlist page once scrolled to */}
      <div className="song-picker-search">
        <DeezerSearch
          onAddFromSearch={onAddFromSearch}
          isSongSelected={isSongSelected}
        />
      </div>
    </>
  );
}
