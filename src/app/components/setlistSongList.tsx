"use client";

import Image from "next/image";
import { Song, LearntMap } from "@/app/types";
import { formatDuration, currentUserLearnt } from "@/app/lib/setlistUtils";

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
    <div className="setlist-song-list">
      {songs.map((song, index) => {
        const learners = learntMap[song.id] || [];
        const isLearnt = currentUserLearnt(song.id, learntMap, userName);
        const isToggling = togglingIds.has(song.id);

        return (
          <div key={song.id} className="setlist-song-item">
            <div className="setlist-song-main">
              <span className="setlist-song-number">{index + 1}</span>
              <div className="setlist-song-info">
                <span className="song-title">{song.title}</span>
                <span className="song-artist">
                  {song.artist}
                  {song.album ? ` — ${song.album}` : ""}
                </span>
              </div>
              <span className="setlist-song-duration">
                {formatDuration(song.duration)}
              </span>
            </div>

            <div className="setlist-song-learnt-row">
              <button
                onClick={() => onToggleLearnt(song.id)}
                disabled={isToggling}
                className={`btn btn-small ${isLearnt ? "btn--learnt" : "btn--tertiary"}`}
              >
                {isToggling ? "..." : isLearnt ? "✓ Learnt" : "Mark as Learnt"}
              </button>

              {learners.length > 0 && (
                <div className="learnt-avatars">
                  {learners.map((learner) => (
                    <div
                      key={learner.userId}
                      className="learnt-avatar"
                      title={learner.userName}
                    >
                      {learner.userImage ? (
                        <Image
                          src={learner.userImage}
                          alt={learner.userName}
                          width={24}
                          height={24}
                          className="learnt-avatar-img"
                        />
                      ) : (
                        <span className="learnt-avatar-fallback">
                          {learner.userName?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {song.preview && (
              <audio
                controls
                src={song.preview}
                className="setlist-song-audio"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
