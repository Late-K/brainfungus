"use client";

import { Song, LearntMap } from "@/app/types";
import SongLearntStatus from "@/app/components/songs/songLearntStatus";
import SongCard from "@/app/components/songs/songCard";
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
  onMoveSong: (index: number, direction: "up" | "down") => void;
  onRemoveSong: (songId: string) => void;
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
  onMoveSong,
  onRemoveSong,
}: SetlistSongListProps) {
  if (songs.length === 0) {
    return (
      <p className="empty-state">No songs yet — add some from the pickers</p>
    );
  }

  return (
    <div className="list">
      {songs.map((song, index) => (
        <SongCard
          key={song.id}
          image={song.image}
          title={song.title}
          artist={song.artist}
          album={song.album}
          duration={song.duration}
          audioSrc={song.isCustom ? song.audioUrl : song.preview}
          deezerTrackId={!song.isCustom ? song.id : undefined}
          leading={
            <>
              <div className="reorder-buttons">
                <button
                  onClick={() => onMoveSong(index, "up")}
                  disabled={index === 0}
                  className="button-reorder"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => onMoveSong(index, "down")}
                  disabled={index === songs.length - 1}
                  className="button-reorder"
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <span className="song-index">{index + 1}</span>
            </>
          }
          actions={
            <>
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
              <button
                onClick={() => onRemoveSong(song.id)}
                className="button button-small button-tertiary button-tertiary-danger"
              >
                Remove
              </button>
            </>
          }
        >
          <SongLearntStatus
            songId={song.id}
            learntMap={learntMap}
            learningIds={learningIds}
            userEmail={userEmail}
            togglingIds={togglingIds}
            onToggleLearnt={onToggleLearnt}
            onToggleLearning={onToggleLearning}
          />
        </SongCard>
      ))}
    </div>
  );
}
