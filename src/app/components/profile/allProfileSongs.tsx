"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPersonalLearningSongAction,
  addPersonalLearntSongAction,
  moveSongAction,
  removePersonalLearningSongAction,
  removePersonalLearntSongAction,
} from "@/app/actions/learntSongs";
import { ProfileLearntSong, ProfileSongList } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import DeezerSearch from "@/app/components/songs/deezerSearch";
import SongInfo from "@/app/components/songs/songInfo";
import SongAudioPlayer from "@/app/components/songs/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/songs/openInMusicAppLink";
import {
  LearningToggleButton,
  LearntToggleButton,
} from "@/app/components/songs/songLearntStatus";
import SortControls from "@/app/components/ui/sortControls";
import { compareByDate, safeTimestamp } from "@/app/lib/sortUtils";
import { unwrapAction } from "@/app/lib/actionResult";

type DateSort = "newest" | "oldest";

const dateSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

const lists = {
  learnt: {
    fetchUrl: "/api/learnt-songs/profile",
    heading: "All Learnt Songs",
    name: "learnt songs",
    addSong: addPersonalLearntSongAction,
    removeSong: removePersonalLearntSongAction,
  },
  learning: {
    fetchUrl: "/api/learning-songs/profile",
    heading: "All Learning Songs",
    name: "learning songs",
    addSong: addPersonalLearningSongAction,
    removeSong: removePersonalLearningSongAction,
  },
};

// the user's full learnt or learning list. each song can be moved over to the
// other list - marked learnt once it's learnt, or relearnt if forgotten
export default function AllProfileSongs({ list }: { list: ProfileSongList }) {
  const config = lists[list];
  const [songs, setSongs] = useState<ProfileLearntSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<DateSort>("newest");

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
      const res = await fetch(config.fetchUrl);
      if (!res.ok) throw new Error(`Failed to fetch ${config.name}`);
      const data = await res.json();
      setSongs(data.songs || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to load ${config.name}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const withSaving = async (songId: string, body: () => Promise<void>) => {
    setSavingIds((prev) => new Set(prev).add(songId));
    try {
      await body();
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

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

    await withSaving(result.id, async () => {
      try {
        unwrapAction(await config.addSong(result));
        await fetchSongs();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to add song");
      }
    });
  };

  const handleRemoveSong = async (song: ProfileLearntSong) => {
    if (!confirm(`Remove "${song.title}" from your ${config.name}?`)) return;

    await withSaving(song.songId, async () => {
      try {
        unwrapAction(await config.removeSong(song.songId));
        setSongs((prev) => prev.filter((s) => s.songId !== song.songId));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to remove song");
      }
    });
  };

  const handleMoveSong = async (song: ProfileLearntSong) => {
    if (savingIds.has(song.songId)) return;

    await withSaving(song.songId, async () => {
      try {
        unwrapAction(
          await moveSongAction(
            song.songId,
            list === "learnt" ? "learning" : "learnt",
          ),
        );
        setSongs((prev) => prev.filter((s) => s.songId !== song.songId));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to move song");
      }
    });
  };

  return (
    <section className="tools-layout">
      <div className="tools-layout-tools">
        <DeezerSearch
          onAddFromSearch={handleAddSong}
          isSongSelected={(songId) => allSongIds.has(songId)}
        />
      </div>

      <div className="card tools-layout-list">
        <div className="section-header">
          <h2>{config.heading}</h2>
        </div>

        <SortControls
          id={`profile-${list}-sort`}
          value={sortBy}
          onChange={setSortBy}
          options={dateSortOptions}
        />

        {error && <p className="alert alert-error">{error}</p>}

        {isLoading ? (
          <p className="empty-state">Loading {config.name}...</p>
        ) : songs.length === 0 ? (
          <p className="empty-state">
            No {config.name} yet. Search for one above to get started.
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
                <OpenInMusicAppLink
                  deezerTrackId={!song.isCustom ? song.songId : undefined}
                  title={song.title}
                  artist={song.artist}
                />

                <div className="learnt-row">
                  {list === "learnt" ? (
                    <LearningToggleButton
                      isLearning={false}
                      isLearnt
                      isToggling={savingIds.has(song.songId)}
                      onToggle={() => handleMoveSong(song)}
                    />
                  ) : (
                    <LearntToggleButton
                      isLearnt={false}
                      isToggling={savingIds.has(song.songId)}
                      onToggle={() => handleMoveSong(song)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
