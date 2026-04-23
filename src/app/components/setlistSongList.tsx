"use client";

import { Song, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongLearntStatus from "@/app/components/songLearntStatus";

interface SetlistSongListProps {
  songs: Song[];
  learntMap: LearntMap;
  userName: string | null | undefined;
  togglingIds: Set<string>;
  onToggleLearnt: (songId: string) => void;
}

export default function SetlistSongList({
  songs,
  learntMap,
  userName,
  togglingIds,
  onToggleLearnt,
}: SetlistSongListProps) {
  if (songs.length === 0) {
    return <p className="empty-state">No songs in this setlist</p>;
  }

  return (
    <div className="list">
      {songs.map((song, index) => {
        return (
          <div key={song.id} className="card-item card-item-compact">
            <div className="song-row">
              <span className="song-index">{index + 1}</span>
              <div className="song-body">
                <span className="item-title">
                  {song.title}
                  {song.isCustom && (
                    <span className="badge" style={{ marginLeft: "0.5rem" }}>
                      Custom
                    </span>
                  )}
                  {song.isCover && (
                    <span className="badge" style={{ marginLeft: "0.5rem" }}>
                      Cover
                    </span>
                  )}
                </span>
                <span className="meta-text meta-text-small block">
                  {song.artist}
                  {song.album ? ` — ${song.album}` : ""}
                </span>
              </div>
              <span className="song-duration">
                {formatDuration(song.duration)}
              </span>
            </div>

            <SongLearntStatus
              songId={song.id}
              learntMap={learntMap}
              userName={userName}
              togglingIds={togglingIds}
              onToggleLearnt={onToggleLearnt}
            />

            {song.preview && (
              <audio controls src={song.preview} className="song-audio" />
            )}
            {song.isCustom && song.audioUrl && (
              <audio controls src={song.audioUrl} className="song-audio" />
            )}
          </div>
        );
      })}
    </div>
  );
}
