"use client";

import { Song, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongLearntStatus from "@/app/components/songLearntStatus";
import SongAudioPlayer from "@/app/components/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/openInMusicAppLink";
import SongInfo from "@/app/components/songInfo";

interface SetlistSongListProps {
  songs: Song[];
  learntMap: LearntMap;
  userEmail: string | null | undefined;
  togglingIds: Set<string>;
  onToggleLearnt: (songId: string) => void;
  coverSongIds?: Set<string>;
  addingCoverIds?: Set<string>;
  onAddToCovers?: (song: Song) => void;
}

export default function SetlistSongList({
  songs,
  learntMap,
  userEmail,
  togglingIds,
  onToggleLearnt,
  coverSongIds,
  addingCoverIds,
  onAddToCovers,
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
              {onAddToCovers &&
                !song.isCustom &&
                (coverSongIds?.has(song.id) ? (
                  <span className="meta-text meta-text-small">✓ Cover</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddToCovers(song)}
                    disabled={addingCoverIds?.has(song.id)}
                    className="button button-small button-secondary"
                    title="Add to band covers"
                  >
                    {addingCoverIds?.has(song.id) ? "..." : "+ Covers"}
                  </button>
                ))}
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
