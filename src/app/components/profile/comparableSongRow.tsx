"use client";

import { ProfileLearntSong } from "@/app/types";
import {
  privateSongBandId,
  profileSongToSetlistSong,
} from "@/app/lib/setlistUtils";
import { MySongStatus } from "@/app/hooks/useMySongStatuses";
import SongCard, { CustomSongNote } from "@/app/components/songs/songCard";
import AddToSonglist from "@/app/components/songs/addToSonglist";
import { LearntStatusRow } from "@/app/components/songs/songLearntStatus";

// one of another user's songs, with the current user's own Learning / Learnt
// toggles, and on full song lists a button to add it to their own songlists
export default function ComparableSongRow({
  song,
  myStatus,
  isSaving,
  onToggle,
  showAddToSonglist = false,
  sharedBandIds,
}: {
  song: ProfileLearntSong;
  myStatus: MySongStatus;
  isSaving: boolean;
  onToggle: (song: ProfileLearntSong, target: "learnt" | "learning") => void;
  // off where the row is part of a preview
  showAddToSonglist?: boolean;
  // bands the current user shares with the person whose profile it is
  sharedBandIds?: string[];
}) {
  return (
    <SongCard
      image={song.image}
      title={song.title}
      artist={song.artist}
      album={song.album}
      extra={
        song.isCustom ? (
          <CustomSongNote bandName={song.bandName} notes={song.notes} />
        ) : undefined
      }
      duration={song.duration}
      audioSrc={song.preview}
      deezerTrackId={!song.isCustom ? song.songId : undefined}
      unavailableLabel="Audio unavailable"
      actions={
        showAddToSonglist && (
          <AddToSonglist
            song={profileSongToSetlistSong(song)}
            onlyBandId={privateSongBandId(song)}
            sharedBandIds={sharedBandIds}
          />
        )
      }
    >
      {/* custom songs can only be added from their band's page */}
      {(myStatus || !song.isCustom) && (
        <LearntStatusRow
          isLearnt={myStatus === "learnt"}
          isLearning={myStatus === "learning"}
          isToggling={isSaving}
          onToggleLearnt={() => onToggle(song, "learnt")}
          onToggleLearning={() => onToggle(song, "learning")}
        />
      )}
    </SongCard>
  );
}
