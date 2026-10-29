"use client";

import Link from "next/link";
import { Setlist, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SetlistSongList from "@/app/components/setlists/setlistSongList";

interface SetlistViewModeProps {
  bandId: string;
  // whether the band keeps its custom songs out of other bands' setlists
  songsPrivate: boolean;
  setlist: Setlist;
  isDeleting: boolean;
  learntMap: LearntMap;
  learningIds: Set<string>;
  togglingIds: Set<string>;
  userEmail: string | null | undefined;
  totalDuration: number;
  progress: number;
  onStartEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onToggleLearnt: (songId: string) => void;
  onToggleLearning: (songId: string) => void;
}

export default function SetlistViewMode({
  bandId,
  songsPrivate,
  setlist,
  isDeleting,
  learntMap,
  learningIds,
  togglingIds,
  userEmail,
  totalDuration,
  progress,
  onStartEdit,
  onToggleActive,
  onDelete,
  onToggleLearnt,
  onToggleLearning,
}: SetlistViewModeProps) {
  return (
    <div className="detail-layout">
      <div
        className={`card margin-bottom detail-layout-side${setlist.isActive ? " card-panel-active" : ""}`}
      >
        <div className="stack margin-bottom">
          <div className="row">
            <h1 className="heading-small">{setlist.name}</h1>
            <Link
              href={`/bands/${bandId}/setlists`}
              className="button button-tertiary ml-auto"
            >
              Back to Setlists
            </Link>
          </div>
          <div className="inline-actions">
            <button onClick={onStartEdit} className="button button-tertiary">
              {" "}
              Edit
            </button>
            <button onClick={onToggleActive} className="button button-tertiary">
              {setlist.isActive ? "Deactivate" : "Set Active"}
            </button>
            {!setlist.isActive && (
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="button button-tertiary button-tertiary-danger"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
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

      <div className="card">
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
        />
      </div>
    </div>
  );
}
