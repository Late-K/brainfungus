"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addBandCoverAction,
  removeBandCoverAction,
} from "@/app/actions/covers";
import { BandCover } from "@/app/types";
import {
  coverToSetlistSong,
  formatDuration,
} from "@/app/lib/setlistUtils";
import SongAudioPlayer from "@/app/components/songs/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/songs/openInMusicAppLink";
import SongLearntStatus from "@/app/components/songs/songLearntStatus";
import DeezerSearch from "@/app/components/songs/deezerSearch";
import SongInfo from "@/app/components/songs/songInfo";
import SortControls from "@/app/components/ui/sortControls";
import AddToSonglist from "@/app/components/songs/addToSonglist";
import { useBandLearntStatus } from "@/app/hooks/useBandLearntStatus";
import {
  compareByDate,
  compareByKnownCount,
  safeTimestamp,
} from "@/app/lib/sortUtils";
import { unwrapAction } from "@/app/lib/actionResult";

type KnownSongSort = "newest" | "oldest" | "mostKnown" | "leastKnown";

const knownSongSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "mostKnown", label: "Most known" },
  { value: "leastKnown", label: "Least known" },
] as const;

interface BandCoversProps {
  bandId: string;
  userEmail: string | null | undefined;
}

export default function BandCovers({ bandId, userEmail }: BandCoversProps) {
  const [covers, setCovers] = useState<BandCover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const {
    learntMap,
    learningIds,
    togglingIds: togglingLearntIds,
    handleToggleLearnt,
    handleToggleLearning,
  } = useBandLearntStatus(bandId);
  const [savingCoverIds, setSavingCoverIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<KnownSongSort>("newest");

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
    return () => controller.abort();
  }, [bandId, fetchCovers]);

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
      unwrapAction(await addBandCoverAction(bandId, song));
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
      unwrapAction(await removeBandCoverAction(bandId, songId));
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

  return (
    <section className="tools-layout">
      <div className="tools-layout-tools">
        <DeezerSearch
          onAddFromSearch={handleAddCover}
          isSongSelected={(songId) => coverSongIds.has(songId)}
        />
      </div>
      <div className="card tools-layout-list">
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
                </div>

                {/* own row so the title keeps its width in narrow columns */}
                <div className="inline-actions song-actions">
                  <AddToSonglist
                    song={coverToSetlistSong(cover)}
                    bandId={bandId}
                    excludeCovers
                  />
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
                  deezerTrackId={cover.isCustom ? undefined : cover.songId}
                />
                <OpenInMusicAppLink
                  deezerTrackId={cover.isCustom ? undefined : cover.songId}
                  title={cover.title}
                  artist={cover.artist}
                />

                <SongLearntStatus
                  songId={cover.songId}
                  learntMap={learntMap}
                  learningIds={learningIds}
                  userEmail={userEmail}
                  togglingIds={togglingLearntIds}
                  onToggleLearnt={handleToggleLearnt}
                  onToggleLearning={handleToggleLearning}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
