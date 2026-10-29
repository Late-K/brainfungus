"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Setlist,
  LearntMap,
  DeezerResult,
  BandCover,
  ProfileLearntSong,
} from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SetlistSongList from "@/app/components/setlists/setlistSongList";
import SetlistSongPickers from "@/app/components/setlists/setlistSongPickers";

interface SetlistViewModeProps {
  bandId: string;
  // whether the band keeps its custom songs out of other bands' setlists
  songsPrivate: boolean;
  setlist: Setlist;
  isDeleting: boolean;
  isSaving: boolean;
  learntMap: LearntMap;
  learningIds: Set<string>;
  togglingIds: Set<string>;
  userEmail: string | null | undefined;
  totalDuration: number;
  progress: number;
  onRename: (name: string) => Promise<boolean>;
  onToggleActive: () => void;
  onDelete: () => void;
  onToggleLearnt: (songId: string) => void;
  onToggleLearning: (songId: string) => void;
  onMoveSong: (index: number, direction: "up" | "down") => void;
  onRemoveSong: (songId: string) => void;
  onAddFromSearch: (result: DeezerResult) => void;
  onToggleCustomSong: (
    songId: string,
    title: string,
    duration?: number,
    image?: string,
  ) => void;
  onToggleCustomAlbum: (
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

export default function SetlistViewMode({
  bandId,
  songsPrivate,
  setlist,
  isDeleting,
  isSaving,
  learntMap,
  learningIds,
  togglingIds,
  userEmail,
  totalDuration,
  progress,
  onRename,
  onToggleActive,
  onDelete,
  onToggleLearnt,
  onToggleLearning,
  onMoveSong,
  onRemoveSong,
  onAddFromSearch,
  onToggleCustomSong,
  onToggleCustomAlbum,
  onToggleCoverSong,
  onToggleProfileSong,
  isSongSelected,
}: SetlistViewModeProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const startRename = () => {
    setNameDraft(setlist.name);
    setIsRenaming(true);
  };

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onRename(nameDraft)) setIsRenaming(false);
  };

  return (
    <div className="detail-layout detail-layout-with-tools">
      <div
        className={`card margin-bottom detail-layout-side${setlist.isActive ? " card-panel-active" : ""}`}
      >
        <div className="stack margin-bottom">
          {isRenaming ? (
            <form onSubmit={submitRename} className="stack">
              <label htmlFor="setlist-name" className="label">
                Setlist Name
              </label>
              <input
                id="setlist-name"
                type="text"
                className="input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Setlist name"
                autoFocus
              />
              <div className="inline-actions">
                <button
                  type="submit"
                  disabled={!nameDraft.trim()}
                  className="button button-primary button-small"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="button button-tertiary button-small"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="row">
              <h1 className="heading-small">{setlist.name}</h1>
              <Link
                href={`/bands/${bandId}/setlists`}
                className="button button-tertiary ml-auto"
              >
                Back to Setlists
              </Link>
            </div>
          )}
          <div className="inline-actions">
            {!isRenaming && (
              <button onClick={startRename} className="button button-tertiary">
                Rename
              </button>
            )}
            <button onClick={onToggleActive} className="button button-tertiary">
              {setlist.isActive ? "Deactivate" : "Set Active"}
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="button button-tertiary button-tertiary-danger"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            {isSaving && (
              <span className="meta-text text-small">Saving...</span>
            )}
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <span className="meta-text text-small">Songs</span>
            <span className="text-semibold">{setlist.songs.length}</span>
          </div>
          <div className="stat-card">
            <span className="meta-text text-small">Duration</span>
            <span className="text-semibold">
              {formatDuration(totalDuration)}
            </span>
          </div>
          <div className="stat-card">
            <span className="meta-text text-small">Created</span>
            <span className="text-semibold">
              {new Date(setlist.createdAt).toLocaleDateString("en-GB", {
                timeZone: "Europe/London",
              })}
            </span>
          </div>
        </div>

        <div className="progress-bar-wrap">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-label">{progress}% learnt by band</span>
        </div>
      </div>

      <div className="card detail-layout-main">
        <h2 className="heading">Songs</h2>

        <SetlistSongList
          bandId={bandId}
          setlistId={setlist._id}
          songsPrivate={songsPrivate}
          songs={setlist.songs}
          learntMap={learntMap}
          learningIds={learningIds}
          userEmail={userEmail}
          togglingIds={togglingIds}
          onToggleLearnt={onToggleLearnt}
          onToggleLearning={onToggleLearning}
          onMoveSong={onMoveSong}
          onRemoveSong={onRemoveSong}
        />
      </div>

      {/* songs picked here are added to (or removed from) the setlist straight away */}
      <div className="detail-layout-tools">
        <h2 className="heading">Add Songs</h2>
        <SetlistSongPickers
          bandId={bandId}
          collapsible
          selectedSongs={setlist.songs}
          onAddFromSearch={onAddFromSearch}
          onToggleCustomSong={onToggleCustomSong}
          onToggleCustomAlbum={onToggleCustomAlbum}
          onToggleCoverSong={onToggleCoverSong}
          onToggleProfileSong={onToggleProfileSong}
          isSongSelected={isSongSelected}
        />
      </div>
    </div>
  );
}
