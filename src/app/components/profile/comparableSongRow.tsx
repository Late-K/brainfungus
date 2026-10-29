"use client";

import { ProfileLearntSong } from "@/app/types";
import {
  formatDuration,
  privateSongBandId,
  profileSongToSetlistSong,
} from "@/app/lib/setlistUtils";
import { MySongStatus } from "@/app/hooks/useMySongStatuses";
import SongInfo from "@/app/components/songs/songInfo";
import SongAudioPlayer from "@/app/components/songs/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/songs/openInMusicAppLink";
import AddToSonglist from "@/app/components/songs/addToSonglist";
import {
  LearningToggleButton,
  LearntToggleButton,
} from "@/app/components/songs/songLearntStatus";

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
    <div className="card-item card-item-compact">
      <div className="song-row">
        <SongInfo
          image={song.image}
          imageAlt={song.title}
          title={song.title}
          meta={[song.artist, song.album].filter(Boolean).join(" — ")}
          extra={
            song.isCustom ? (
              <>
                {song.bandName ? (
                  <>
                    Custom song from <strong>{song.bandName}</strong>
                  </>
                ) : (
                  "Custom song"
                )}
                {song.notes ? ` - Note: ${song.notes}` : ""}
              </>
            ) : undefined
          }
        />
        {song.duration ? (
          <span className="song-duration">
            {formatDuration(song.duration)}
          </span>
        ) : null}
        {/* custom songs can only be added from their band's page */}
        {(myStatus || !song.isCustom) && (
          <div className="compare-learnt-buttons">
            <LearningToggleButton
              isLearning={myStatus === "learning"}
              isLearnt={myStatus === "learnt"}
              isToggling={isSaving}
              onToggle={() => onToggle(song, "learning")}
              className="compare-learnt-button"
            />
            <LearntToggleButton
              isLearnt={myStatus === "learnt"}
              isToggling={isSaving}
              onToggle={() => onToggle(song, "learnt")}
              className="compare-learnt-button"
            />
          </div>
        )}
      </div>

      <SongAudioPlayer
        src={song.preview}
        deezerTrackId={!song.isCustom ? song.songId : undefined}
        unavailableLabel="Audio unavailable"
      />
      <OpenInMusicAppLink
        deezerTrackId={!song.isCustom ? song.songId : undefined}
        title={song.title}
        artist={song.artist}
      />
      {showAddToSonglist && (
        <div className="learnt-row">
          <AddToSonglist
            song={profileSongToSetlistSong(song)}
            onlyBandId={privateSongBandId(song)}
            sharedBandIds={sharedBandIds}
          />
        </div>
      )}
    </div>
  );
}
