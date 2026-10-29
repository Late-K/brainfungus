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
import {
  privateSongBandId,
  profileSongToSetlistSong,
} from "@/app/lib/setlistUtils";
import DeezerSearch from "@/app/components/songs/deezerSearch";
import SongCard, { CustomSongNote } from "@/app/components/songs/songCard";
import { LearntStatusRow } from "@/app/components/songs/songLearntStatus";
import SortControls from "@/app/components/ui/sortControls";
import AddToSonglist from "@/app/components/songs/addToSonglist";
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
              <SongCard
                key={song.id}
                image={song.image}
                title={song.title}
                artist={song.artist}
                album={song.album}
                extra={
                  song.isCustom ? (
                    <CustomSongNote
                      bandName={song.bandName}
                      notes={song.notes}
                    />
                  ) : undefined
                }
                duration={song.duration}
                audioSrc={song.preview}
                deezerTrackId={!song.isCustom ? song.songId : undefined}
                unavailableLabel="Audio unavailable"
                actions={
                  <>
                    <AddToSonglist
                      song={profileSongToSetlistSong(song)}
                      onlyBandId={privateSongBandId(song)}
                    />
                    <button
                      onClick={() => handleRemoveSong(song)}
                      disabled={savingIds.has(song.songId)}
                      className="button button-small button-tertiary button-tertiary-danger"
                    >
                      Remove
                    </button>
                  </>
                }
              >
                {/* turning off this list's toggle removes the song, the other moves it across */}
                <LearntStatusRow
                  isLearnt={list === "learnt"}
                  isLearning={list === "learning"}
                  isToggling={savingIds.has(song.songId)}
                  onToggleLearnt={() =>
                    list === "learnt"
                      ? handleRemoveSong(song)
                      : handleMoveSong(song)
                  }
                  onToggleLearning={() =>
                    list === "learning"
                      ? handleRemoveSong(song)
                      : handleMoveSong(song)
                  }
                />
              </SongCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
