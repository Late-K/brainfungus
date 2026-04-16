// selected setlist page

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Setlist, LearntMap, Band } from "@/app/types";
import {
  deleteSetlistAction,
  setActiveSetlistAction,
  deactivateSetlistAction,
} from "@/app/actions/setlists";
import { toggleLearntSongAction } from "@/app/actions/learntSongs";
import { formatDuration, getProgress } from "@/app/lib/setlistUtils";
import { useSetlistEditor } from "@/app/hooks/useSetlistEditor";
import SetlistSongList from "@/app/components/setlistSongList";
import SetlistEditMode from "@/app/components/setlistEditMode";

export default function SetlistDetailPage({
  params,
}: {
  params: Promise<{ id: string; setlistId: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bandId, setBandId] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [setlistId, setSetlistId] = useState<string | null>(null);
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [memberCount, setMemberCount] = useState(0);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const editor = useSetlistEditor({
    onSaveSuccess: (name, songs) => {
      setSetlist((prev) => (prev ? { ...prev, name, songs } : prev));
    },
  });

  useEffect(() => {
    const unwrapParams = async () => {
      const { id, setlistId } = await params;
      setBandId(id);
      setSetlistId(setlistId);
    };
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!bandId) return;
    async function fetchBand() {
      try {
        const res = await fetch(`/api/bands/${bandId}`);
        if (res.ok) {
          const data = await res.json();
          setBand(data.band);
        }
      } catch (err) {
        console.error("Failed to fetch band:", err);
      }
    }
    fetchBand();
  }, [bandId]);

  const fetchData = useCallback(async () => {
    if (!setlistId || !bandId) return;
    try {
      setIsLoading(true);
      setError("");

      const [setlistRes, learntRes, bandRes] = await Promise.all([
        fetch(`/api/setlists/${setlistId}`),
        fetch(`/api/learnt-songs?bandId=${bandId}`),
        fetch(`/api/bands/${bandId}`),
      ]);

      if (!setlistRes.ok) {
        throw new Error(
          setlistRes.status === 404
            ? "Setlist not found"
            : "Failed to fetch setlist",
        );
      }

      const setlistData = await setlistRes.json();
      setSetlist(setlistData.setlist);

      if (learntRes.ok) {
        const learntData = await learntRes.json();
        setLearntMap(learntData.learntMap || {});
      }

      if (bandRes.ok) {
        const bandData = await bandRes.json();
        setMemberCount(bandData.band?.memberIds?.length || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setlist");
    } finally {
      setIsLoading(false);
    }
  }, [setlistId, bandId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this setlist?")) return;
    if (!setlistId) return;
    try {
      setIsDeleting(true);
      await deleteSetlistAction(setlistId);
      router.push(`/bands/${bandId}/setlists`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete setlist");
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!bandId || !setlistId || !setlist) return;
    try {
      if (setlist.isActive) {
        await deactivateSetlistAction(bandId, setlistId);
        setSetlist({ ...setlist, isActive: false });
      } else {
        await setActiveSetlistAction(bandId, setlistId);
        setSetlist({ ...setlist, isActive: true });
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to update setlist status",
      );
    }
  };

  const handleToggleLearnt = async (songId: string) => {
    if (!bandId) return;
    setTogglingIds((prev) => new Set(prev).add(songId));
    try {
      await toggleLearntSongAction(bandId, songId);
      const learntRes = await fetch(`/api/learnt-songs?bandId=${bandId}`);
      if (learntRes.ok) {
        const learntData = await learntRes.json();
        setLearntMap(learntData.learntMap || {});
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to toggle learnt status",
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const totalDuration =
    setlist?.songs.reduce((sum, song) => sum + song.duration, 0) || 0;
  const progress = setlist ? getProgress(setlist, learntMap, memberCount) : 0;

  if (isLoading) {
    return (
      <div className="page-container">
        <p className="empty-state">Loading setlist...</p>
      </div>
    );
  }

  if (error || !setlist) {
    return (
      <div className="page-container">
        <div className="card">
          <p className="alert alert--error">{error || "Setlist not found"}</p>
          <Link href={`/bands/${bandId}`} className="back-link">
            ← Back to {band?.name || "Band"}
          </Link>
        </div>
      </div>
    );
  }

  // ===================== EDIT MODE =====================
  if (editor.isEditing) {
    return (
      <div className="page-container">
        <SetlistEditMode
          bandId={bandId!}
          editName={editor.editName}
          setEditName={editor.setEditName}
          editSongs={editor.editSongs}
          isSaving={editor.isSaving}
          searchQuery={editor.searchQuery}
          setSearchQuery={editor.setSearchQuery}
          searchResults={editor.searchResults}
          isSearching={editor.isSearching}
          searchError={editor.searchError}
          onSave={() => editor.handleSave(setlistId!)}
          onCancel={editor.cancelEditing}
          onRemoveSong={editor.handleRemoveEditSong}
          onMoveSong={editor.handleMoveSong}
          onSearch={editor.handleSearch}
          onAddFromSearch={editor.handleAddFromSearch}
          onToggleCustomSong={editor.handleToggleCustomSong}
          onToggleCustomAlbum={editor.handleToggleCustomAlbum}
          isEditSongSelected={editor.isEditSongSelected}
          saveLabel="Save Changes"
        />
      </div>
    );
  }

  // ===================== VIEW MODE =====================
  return (
    <div className="page-container">
      <Link href={`/bands/${bandId}/setlists`} className="back-link">
        ← Back to Setlists
      </Link>

      <div className="card setlist-detail-card">
        <div className="setlist-detail-header">
          <div className="setlist-detail-title-row">
            <h1>{setlist.name}</h1>
            {setlist.isActive && (
              <span className="badge badge--active">Active</span>
            )}
          </div>
          <div className="setlist-detail-actions">
            <button
              onClick={() => editor.startEditing(setlist.name, setlist.songs)}
              className="btn btn--tertiary"
            >
              {" "}
              Edit
            </button>
            <button onClick={handleToggleActive} className="btn btn--tertiary">
              {setlist.isActive ? "Deactivate" : "Set Active"}
            </button>
            {!setlist.isActive && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn btn--tertiary btn--tertiary-danger"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </div>

        <div className="setlist-stats-row">
          <div className="setlist-stat">
            <span className="setlist-stat-label">Songs</span>
            <span className="setlist-stat-value">{setlist.songs.length}</span>
          </div>
          <div className="setlist-stat">
            <span className="setlist-stat-label">Duration</span>
            <span className="setlist-stat-value">
              {formatDuration(totalDuration)}
            </span>
          </div>
          <div className="setlist-stat">
            <span className="setlist-stat-label">Created</span>
            <span className="setlist-stat-value">
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
        <h2 className="setlist-title">Songs</h2>

        <SetlistSongList
          songs={setlist.songs}
          learntMap={learntMap}
          userName={session.user?.name}
          togglingIds={togglingIds}
          onToggleLearnt={handleToggleLearnt}
        />
      </div>
    </div>
  );
}
