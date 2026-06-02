"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addBandCoverAction,
  removeBandCoverAction,
} from "@/app/actions/covers";
import { toggleLearntSongAction } from "@/app/actions/learntSongs";
import { BandCover, LearntMap } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import SongAudioPlayer from "@/app/components/songAudioPlayer";
import SongLearntStatus from "@/app/components/songLearntStatus";
import DeezerSearch from "@/app/components/deezerSearch";
import SongInfo from "@/app/components/songInfo";
import SortControls from "@/app/components/sortControls";
import { useDeezerSearch } from "@/app/hooks/useDeezerSearch";
import {
  compareByDate,
  compareByKnownCount,
  safeTimestamp,
} from "@/app/lib/sortUtils";

type KnownSongSort = "newest" | "oldest" | "mostKnown" | "leastKnown";

const knownSongSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "mostKnown", label: "Most known" },
  { value: "leastKnown", label: "Least known" },
] as const;

interface BandCoversComponentProps {
  bandId: string;
  userEmail: string | null | undefined;
}

export default function BandCoversComponent({
  bandId,
  userEmail,
}: BandCoversComponentProps) {
  const [covers, setCovers] = useState<BandCover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [learntMap, setLearntMap] = useState<LearntMap>({});
  const [togglingLearntIds, setTogglingLearntIds] = useState<Set<string>>(
    new Set(),
  );
  const [savingCoverIds, setSavingCoverIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<KnownSongSort>("newest");

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

  const sortedCovers = useMemo(() => {
    const getTimestamp = (cover: BandCover) => {
      return safeTimestamp(cover.createdAt);
    };

    const getKnownCount = (cover: BandCover) =>
      learntMap[cover.songId]?.length ?? 0;

    const sorted = [...covers];
    sorted.sort((a, b) => {
      if (sortBy === "newest") {
        return compareByDate(getTimestamp(a), getTimestamp(b), "newest");
      }
      if (sortBy === "oldest") {
        return compareByDate(getTimestamp(a), getTimestamp(b), "oldest");
      }
      if (sortBy === "mostKnown") {
        const knownDiff = compareByKnownCount(
          getKnownCount(a),
          getKnownCount(b),
          "mostKnown",
        );
        if (knownDiff !== 0) return knownDiff;
        return compareByDate(getTimestamp(a), getTimestamp(b), "newest");
      }

      const knownDiff = compareByKnownCount(
        getKnownCount(a),
        getKnownCount(b),
        "leastKnown",
      );
      if (knownDiff !== 0) return knownDiff;
      return compareByDate(getTimestamp(a), getTimestamp(b), "newest");
    });
    return sorted;
  }, [covers, learntMap, sortBy]);

  const fetchLearntMap = useCallback(
    async (signal?: AbortSignal) => {
      if (!bandId) return;

      try {
        const res = await fetch(`/api/learnt-songs?bandId=${bandId}`, {
          signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (signal?.aborted) return;
        setLearntMap(data.learntMap || {});
      } catch {
        // keep covers visible even if learnt stats fail
      }
    },
    [bandId],
  );

  const fetchCovers = useCallback(
    async (signal?: AbortSignal) => {
      if (!bandId) return;

      try {
        setIsLoading(true);
        setError("");
        const res = await fetch(`/api/covers?bandId=${bandId}`, { signal });
        if (!res.ok) {
          throw new Error("Failed to fetch covers");
        }
        const data = await res.json();
        if (signal?.aborted) return;
        setCovers(data.covers || []);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load covers");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    [bandId],
  );

  useEffect(() => {
    if (!bandId) return;
    const controller = new AbortController();
    fetchCovers(controller.signal);
    fetchLearntMap(controller.signal);
    return () => controller.abort();
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
        <div className="section-header">
          <h2>Band Covers</h2>
        </div>

        <SortControls
          id="covers-sort"
          value={sortBy}
          onChange={setSortBy}
          options={knownSongSortOptions}
        />

        {error && <p className="alert alert-error">{error}</p>}

        {isLoading ? (
          <p className="empty-state">Loading covers...</p>
        ) : covers.length === 0 ? (
          <p className="empty-state">
            No covers yet. Search and add one above.
          </p>
        ) : (
          <div className="list list-top">
            {sortedCovers.map((cover) => (
              <div key={cover._id} className="card-item card-item-compact">
                <div className="song-row">
                  <SongInfo
                    image={cover.image}
                    imageAlt={cover.title}
                    title={cover.title}
                    meta={
                      <>
                        {cover.artist}
                        {cover.album ? ` — ${cover.album}` : ""}
                      </>
                    }
                  />
                  <span className="song-duration">
                    {formatDuration(cover.duration)}
                  </span>
                  <button
                    onClick={() => handleRemoveCover(cover.songId)}
                    disabled={savingCoverIds.has(cover.songId)}
                    className="button button-small button-tertiary button-tertiary-danger"
                  >
                    Remove
                  </button>
                </div>

                <SongAudioPlayer
                  src={cover.preview}
                  deezerTrackId={cover.songId}
                />

                <SongLearntStatus
                  songId={cover.songId}
                  learntMap={learntMap}
                  userEmail={userEmail}
                  togglingIds={togglingLearntIds}
                  onToggleLearnt={handleToggleLearnt}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
