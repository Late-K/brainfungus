"use client";

import { Song, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongLearntStatus from "@/app/components/songLearntStatus";
import SongAudioPlayer from "@/app/components/songAudioPlayer";
import SongInfo from "@/app/components/songInfo";

interface SetlistSongListProps {
  songs: Song[];
  learntMap: LearntMap;
  userEmail: string | null | undefined;
  togglingIds: Set<string>;
  onToggleLearnt: (songId: string) => void;
}

export default function SetlistSongList({
  songs,
  learntMap,
  userEmail,
  togglingIds,
  onToggleLearnt,
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
              <span className="song-duration">
                {formatDuration(song.duration)}
              </span>
            </div>

            <SongAudioPlayer
              src={audioSrc}
              deezerTrackId={!song.isCustom ? song.id : undefined}
            />

            <SongLearntStatus
              songId={song.id}
              learntMap={learntMap}
              userEmail={userEmail}
              togglingIds={togglingIds}
              onToggleLearnt={onToggleLearnt}
            />
          </div>
        );
      })}
    </div>
  );
}
