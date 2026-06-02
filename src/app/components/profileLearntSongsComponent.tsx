"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPersonalLearntSongAction,
  removePersonalLearntSongAction,
} from "@/app/actions/learntSongs";
import { ProfileLearntSong } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import DeezerSearch from "@/app/components/deezerSearch";
import SongInfo from "@/app/components/songInfo";
import SongAudioPlayer from "@/app/components/songAudioPlayer";
import SortControls from "@/app/components/sortControls";
import { useDeezerSearch } from "@/app/hooks/useDeezerSearch";
import { compareByDate, safeTimestamp } from "@/app/lib/sortUtils";

type DateSort = "newest" | "oldest";

const dateSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

export default function ProfileLearntSongsComponent() {
  const [songs, setSongs] = useState<ProfileLearntSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<DateSort>("newest");

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    handleSearch,
  } = useDeezerSearch();

  const personalSongIds = useMemo(
    () =>
      new Set(
        songs.filter((s) => s.source === "personal").map((s) => s.songId),
      ),
    [songs],
  );

  const allSongIds = useMemo(
    () => new Set(songs.map((s) => s.songId)),
    [songs],
  );

  // Deduplicate by songId — prefer personal entry, then most recent
  const sortedSongs = useMemo(() => {
    const seen = new Set<string>();
    const deduped: ProfileLearntSong[] = [];
    // personal first so they take priority
    const sorted = [...songs].sort((a, b) => {
      if (a.source === "personal" && b.source !== "personal") return -1;
      if (b.source === "personal" && a.source !== "personal") return 1;
      return 0;
    });
    for (const s of sorted) {
      if (!seen.has(s.songId)) {
        seen.add(s.songId);
        deduped.push(s);
      }
    }

    const getTimestamp = (song: ProfileLearntSong) => {
      return safeTimestamp(song.createdAt);
    };

    return deduped.sort((a, b) =>
      compareByDate(getTimestamp(a), getTimestamp(b), sortBy),
    );
  }, [songs, sortBy]);

  const fetchSongs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch("/api/learnt-songs/profile");
      if (!res.ok) throw new Error("Failed to fetch learnt songs");
      const data = await res.json();
      setSongs(data.songs || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load learnt songs",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleAddSong = async (result: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    preview?: string;
    image?: string;
  }) => {
    if (savingIds.has(result.id)) return;

    setSavingIds((prev) => new Set(prev).add(result.id));
    try {
      await addPersonalLearntSongAction(result);
      await fetchSongs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add song");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(result.id);
        return next;
      });
    }
  };

  const handleRemoveSong = async (song: ProfileLearntSong) => {
    if (!confirm(`Remove "${song.title}" from your learnt songs?`)) return;

    setSavingIds((prev) => new Set(prev).add(song.songId));
    try {
      await removePersonalLearntSongAction(song.songId);
      setSongs((prev) => prev.filter((s) => s.songId !== song.songId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove song");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(song.songId);
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
        onAddFromSearch={handleAddSong}
        isSongSelected={(songId) => allSongIds.has(songId)}
      />

      <div className="card">
        <div className="section-header">
          <h2>All Learnt Songs</h2>
        </div>

        <SortControls
          id="profile-learnt-sort"
          value={sortBy}
          onChange={setSortBy}
          options={dateSortOptions}
        />

        {error && <p className="alert alert-error">{error}</p>}

        {isLoading ? (
          <p className="empty-state">Loading learnt songs...</p>
        ) : songs.length === 0 ? (
          <p className="empty-state">
            No learnt songs yet. Search for one above to get started.
          </p>
        ) : (
          <div className="list list-top">
            {sortedSongs.map((song) => (
              <div key={song.id} className="card-item card-item-compact">
                <div className="song-row">
                  <SongInfo
                    image={song.image}
                    imageAlt={song.title}
                    title={song.title}
                    meta={[song.artist, song.album].filter(Boolean).join(" — ")}
                    extra={
                      song.isCustom ? (
                        <>
                          {song.bandName ? (
                            <>
                              Custom song from <strong>{song.bandName}</strong>
                            </>
                          ) : (
                            "Custom song"
                          )}
                          {song.notes ? ` - Note: ${song.notes}` : ""}
                        </>
                      ) : undefined
                    }
                  />
                  {song.duration ? (
                    <span className="song-duration">
                      {formatDuration(song.duration)}
                    </span>
                  ) : null}
                  <button
                    onClick={() => handleRemoveSong(song)}
                    disabled={savingIds.has(song.songId)}
                    className="button button-small button-tertiary button-tertiary-danger"
                  >
                    Remove
                  </button>
                </div>

                <SongAudioPlayer
                  src={song.preview}
                  deezerTrackId={!song.isCustom ? song.songId : undefined}
                  unavailableLabel="Audio unavailable"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
