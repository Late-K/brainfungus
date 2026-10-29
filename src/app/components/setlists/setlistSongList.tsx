"use client";

import { Song, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongLearntStatus from "@/app/components/songs/songLearntStatus";
import SongAudioPlayer from "@/app/components/songs/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/songs/openInMusicAppLink";
import SongInfo from "@/app/components/songs/songInfo";
import AddToSonglist from "@/app/components/songs/addToSonglist";

interface SetlistSongListProps {
  bandId: string;
  setlistId: string;
  // whether the band keeps its custom songs out of other bands' setlists
  songsPrivate: boolean;
  songs: Song[];
  learntMap: LearntMap;
  learningIds: Set<string>;
  userEmail: string | null | undefined;
  togglingIds: Set<string>;
  onToggleLearnt: (songId: string) => void;
  onToggleLearning: (songId: string) => void;
}

export default function SetlistSongList({
  bandId,
  setlistId,
  songsPrivate,
  songs,
  learntMap,
  learningIds,
  userEmail,
  togglingIds,
  onToggleLearnt,
  onToggleLearning,
}: SetlistSongListProps) {
  if (songs.length === 0) {
    return <p className="empty-state">No songs in this setlist</p>;
  }

  return (
    <div className="list">
      {songs.map((song, index) => {
        const audioSrc = song.isCustom ? song.audioUrl : song.preview;

        return (
          <div key={song.id} className="card-item card-item-compact">
            <div className="song-row">
              <span className="song-index">{index + 1}</span>
              <SongInfo
                image={song.image}
                imageAlt={song.title}
                title={song.title}
                meta={
                  <>
                    {song.artist}
                    {song.album ? ` — ${song.album}` : ""}
                  </>
                }
              />
              {song.duration > 0 && (
                <span className="song-duration">
                  {formatDuration(song.duration)}
                </span>
              )}
            </div>

            <SongAudioPlayer
              src={audioSrc}
              deezerTrackId={!song.isCustom ? song.id : undefined}
            />
            <OpenInMusicAppLink
              deezerTrackId={!song.isCustom ? song.id : undefined}
              title={song.title}
              artist={song.artist}
            />
            <div className="learnt-row">
              <AddToSonglist
                song={song}
                bandId={bandId}
                excludeSetlistId={setlistId}
                onlyBandId={
                  song.isCustom && songsPrivate && song.bandId === bandId
                    ? bandId
                    : undefined
                }
              />
            </div>

            <SongLearntStatus
              songId={song.id}
              learntMap={learntMap}
              learningIds={learningIds}
              userEmail={userEmail}
              togglingIds={togglingIds}
              onToggleLearnt={onToggleLearnt}
              onToggleLearning={onToggleLearning}
            />
          </div>
        );
      })}
    </div>
  );
}
