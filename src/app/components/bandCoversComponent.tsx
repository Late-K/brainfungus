"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addBandCoverAction,
  removeBandCoverAction,
} from "@/app/actions/covers";
import { toggleLearntSongAction } from "@/app/actions/learntSongs";
import { BandCover, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongLearntStatus from "@/app/components/songLearntStatus";
import DeezerSearch from "@/app/components/deezerSearch";
import { useDeezerSearch } from "@/app/hooks/useDeezerSearch";

interface BandCoversComponentProps {
  bandId: string;
  userName: string | null | undefined;
}

export default function BandCoversComponent({
  bandId,
  userName,
}: BandCoversComponentProps) {
  const [covers, setCovers] = useState<BandCover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [togglingLearntIds, setTogglingLearntIds] = useState<Set<string>>(
    new Set(),
  );
  const [savingCoverIds, setSavingCoverIds] = useState<Set<string>>(new Set());

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
  } = useDeezerSearch();

  const coverSongIds = useMemo(
    () => new Set(covers.map((cover) => cover.songId)),
    [covers],
  );

  const fetchLearntMap = useCallback(async () => {
    if (!bandId) return;

    try {
      const res = await fetch(`/api/learnt-songs?bandId=${bandId}`);
      if (!res.ok) return;
      const data = await res.json();
      setLearntMap(data.learntMap || {});
    } catch {
      // keep covers visible even if learnt stats fail
    }
  }, [bandId]);

  const fetchCovers = useCallback(async () => {
    if (!bandId) return;

    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`/api/covers?bandId=${bandId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch covers");
      }
      const data = await res.json();
      setCovers(data.covers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load covers");
    } finally {
      setIsLoading(false);
    }
  }, [bandId]);

  useEffect(() => {
    if (!bandId) return;
    fetchCovers();
    fetchLearntMap();
  }, [bandId, fetchCovers, fetchLearntMap]);

  const handleAddCover = async (song: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    preview?: string;
    image?: string;
  }) => {
    if (!bandId || savingCoverIds.has(song.id)) return;

    setSavingCoverIds((prev) => new Set(prev).add(song.id));
    try {
      await addBandCoverAction(bandId, song);
      await fetchCovers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add cover");
    } finally {
      setSavingCoverIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  };

  const handleRemoveCover = async (songId: string) => {
    if (!bandId || savingCoverIds.has(songId)) return;
    if (!confirm("Remove this song from band covers?")) return;

    setSavingCoverIds((prev) => new Set(prev).add(songId));
    try {
      await removeBandCoverAction(bandId, songId);
      setCovers((prev) => prev.filter((cover) => cover.songId !== songId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove cover");
    } finally {
      setSavingCoverIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleToggleLearnt = async (songId: string) => {
    if (!bandId) return;

    setTogglingLearntIds((prev) => new Set(prev).add(songId));
    try {
      await toggleLearntSongAction(bandId, songId);
      await fetchLearntMap();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to toggle learnt status",
      );
    } finally {
      setTogglingLearntIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  return (
    <section>
      <DeezerSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        searchError={searchError}
        onSearch={handleSearch}
        onAddFromSearch={handleAddCover}
        isSongSelected={(songId) => coverSongIds.has(songId)}
      />
      <div className="card">
        <h2>Band Covers</h2>

        {error && <p className="alert alert--error">{error}</p>}

        {isLoading ? (
          <p className="empty-state">Loading covers...</p>
        ) : covers.length === 0 ? (
          <p className="empty-state">
            No covers yet. Search and add one above.
          </p>
        ) : (
          <div className="list" style={{ marginTop: "1rem" }}>
            {covers.map((cover, index) => (
              <div key={cover._id} className="card-item card-item-compact">
                <div className="song-row">
                  <span className="song-index">{index + 1}</span>
                  <div className="song-body">
                    <span className="item-title">{cover.title}</span>
                    <span className="meta-text meta-text-small block">
                      {cover.artist}
                      {cover.album ? ` — ${cover.album}` : ""}
                    </span>
                  </div>
                  <span className="song-duration">
                    {formatDuration(cover.duration)}
                  </span>
                  <button
                    onClick={() => handleRemoveCover(cover.songId)}
                    disabled={savingCoverIds.has(cover.songId)}
                    className="btn btn-small btn--tertiary btn--tertiary-danger"
                  >
                    Remove
                  </button>
                </div>

                <SongLearntStatus
                  songId={cover.songId}
                  learntMap={learntMap}
                  userName={userName}
                  togglingIds={togglingLearntIds}
                  onToggleLearnt={handleToggleLearnt}
                />

                {cover.preview && (
                  <audio controls src={cover.preview} className="song-audio" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
