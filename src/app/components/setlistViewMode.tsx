"use client";

import Link from "next/link";
import { Setlist, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SetlistSongList from "@/app/components/setlistSongList";

interface SetlistViewModeProps {
  bandId: string;
  setlist: Setlist;
  isDeleting: boolean;
  learntMap: LearntMap;
  togglingIds: Set<string>;
  userName: string | null | undefined;
  totalDuration: number;
  progress: number;
  onStartEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onToggleLearnt: (songId: string) => void;
}

export default function SetlistViewMode({
  bandId,
  setlist,
  isDeleting,
  learntMap,
  togglingIds,
  userName,
  totalDuration,
  progress,
  onStartEdit,
  onToggleActive,
  onDelete,
  onToggleLearnt,
}: SetlistViewModeProps) {
  return (
    <>
      <Link href={`/bands/${bandId}/setlists`} className="back-link">
        ← Back to Setlists
      </Link>

      <div className="card margin-bottom">
        <div className="stack margin-bottom">
          <div className="row">
            <h1>{setlist.name}</h1>
            {setlist.isActive && (
              <span className="badge badge--active">Active</span>
            )}
          </div>
          <div className="inline-actions">
            <button onClick={onStartEdit} className="btn btn--tertiary">
              {" "}
              Edit
            </button>
            <button onClick={onToggleActive} className="btn btn--tertiary">
              {setlist.isActive ? "Deactivate" : "Set Active"}
            </button>
            {!setlist.isActive && (
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="btn btn--tertiary btn--tertiary-danger"
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
          songs={setlist.songs}
          learntMap={learntMap}
          userName={userName}
          togglingIds={togglingIds}
          onToggleLearnt={onToggleLearnt}
        />
      </div>
    </>
  );
}
