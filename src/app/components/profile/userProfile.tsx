"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addPersonalLearntSongAction } from "@/app/actions/learntSongs";
import { ProfileLearntSong, PublicUserProfile } from "@/app/types";
import { formatDuration } from "@/app/lib/setlistUtils";
import { compareByDate, safeTimestamp } from "@/app/lib/sortUtils";
import { useFetchData } from "@/app/hooks/useFetchData";
import SongInfo from "@/app/components/songs/songInfo";
import SongAudioPlayer from "@/app/components/songs/songAudioPlayer";
import OpenInMusicAppLink from "@/app/components/songs/openInMusicAppLink";
import SortControls from "@/app/components/ui/sortControls";
import PageLoading from "@/app/components/ui/pageLoading";
import PageErrorCard from "@/app/components/ui/pageErrorCard";
import InviteToBand from "@/app/components/profile/inviteToBand";
import { unwrapAction } from "@/app/lib/actionResult";

type CompareFilter = "theirs" | "common" | "onlyThem" | "onlyMe";
type DateSort = "newest" | "oldest";

const dateSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

export default function UserProfile({ userId }: { userId: string }) {
  const router = useRouter();
  const { data, isLoading, error } = useFetchData<PublicUserProfile>(
    `/api/users/${userId}`,
  );
  const [filter, setFilter] = useState<CompareFilter>("theirs");
  const [sortBy, setSortBy] = useState<DateSort>("newest");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const theirSongs = useMemo(() => data?.songs ?? [], [data]);
  const mySongs = useMemo(() => data?.mySongs ?? [], [data]);

  const mySongIds = useMemo(
    () => new Set([...mySongs.map((s) => s.songId), ...addedIds]),
    [mySongs, addedIds],
  );
  const theirSongIds = useMemo(
    () => new Set(theirSongs.map((s) => s.songId)),
    [theirSongs],
  );

  const commonSongs = theirSongs.filter((s) => mySongIds.has(s.songId));
  const onlyThemSongs = theirSongs.filter((s) => !mySongIds.has(s.songId));
  const onlyMeSongs = mySongs.filter((s) => !theirSongIds.has(s.songId));

  const filteredSongs = {
    theirs: theirSongs,
    common: commonSongs,
    onlyThem: onlyThemSongs,
    onlyMe: onlyMeSongs,
  }[filter];

  const sortedSongs = [...filteredSongs].sort((a, b) =>
    compareByDate(
      safeTimestamp(a.createdAt),
      safeTimestamp(b.createdAt),
      sortBy,
    ),
  );

  const handleAddSong = async (song: ProfileLearntSong) => {
    if (savingIds.has(song.songId)) return;

    setSavingIds((prev) => new Set(prev).add(song.songId));
    try {
      unwrapAction(
        await addPersonalLearntSongAction({
          id: song.songId,
          title: song.title,
          artist: song.artist ?? "",
          album: song.album ?? "",
          duration: song.duration ?? 0,
          preview: song.preview,
          image: song.image,
        }),
      );
      setAddedIds((prev) => new Set(prev).add(song.songId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add song");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(song.songId);
        return next;
      });
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading profile..." />;
  }

  if (error || !data) {
    return (
      <PageErrorCard
        error={
          /\((400|404)\)/.test(error)
            ? "User not found"
            : error || "Failed to load profile"
        }
        backHref="/profile"
        backLabel="Back to Profile"
      />
    );
  }

  const { user, isPrivate } = data;
  const firstName = user.name.split(" ")[0];
  const matchPercent = theirSongs.length
    ? Math.round((commonSongs.length / theirSongs.length) * 100)
    : 0;

  const filterTabs: { value: CompareFilter; label: string; count: number }[] = [
    { value: "theirs", label: "All", count: theirSongs.length },
    { value: "common", label: "In common", count: commonSongs.length },
    {
      value: "onlyThem",
      label: `Only ${firstName}`,
      count: onlyThemSongs.length,
    },
    { value: "onlyMe", label: "Only you", count: onlyMeSongs.length },
  ];

  const emptyMessages: Record<CompareFilter, string> = {
    theirs: `${firstName} hasn't learnt any songs yet.`,
    common: "No songs in common yet.",
    onlyThem: `You know every song ${firstName} knows!`,
    onlyMe: `${firstName} knows every song you know!`,
  };

  // desktop pins the profile and stats on the left with the song list on the right
  return (
    <div className="detail-layout">
      <div className="card detail-layout-side">
        <div className="row-end">
          <button
            className="button button-tertiary"
            onClick={() => router.back()}
          >
            Back
          </button>
        </div>
        <div className="media-row">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={90}
              height={90}
              className="avatar-large"
            />
          ) : (
            <div className="avatar-large placeholder">
              {user.name.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <div>
            <h1 className="heading-small">{user.name}</h1>
            {!isPrivate && (
              <p className="meta-text meta-text-medium margin-top">
                {theirSongs.length} learnt{" "}
                {theirSongs.length === 1 ? "song" : "songs"}
              </p>
            )}
          </div>
        </div>

        {!isPrivate && (
          <div className="stat-grid profile-stats">
            <div className="stat-card">
              <span className="meta-text text-small">In common</span>
              <span className="text-semibold">{commonSongs.length}</span>
            </div>
            <div className="stat-card">
              <span className="meta-text text-small">Match</span>
              <span className="text-semibold">{matchPercent}%</span>
            </div>
            <div className="stat-card">
              <span className="meta-text text-small">You know</span>
              <span className="text-semibold">{mySongIds.size}</span>
            </div>
          </div>
        )}

        <InviteToBand
          userId={user._id}
          firstName={firstName}
          bands={data.inviteBands}
        />
      </div>

      {isPrivate ? (
        <section className="card">
          <div className="section-header">
            <h2>Learnt Songs</h2>
          </div>
          <p className="empty-state">
            {firstName} keeps their learnt songs private.
          </p>
        </section>
      ) : (
        <section className="card">
          <div className="section-header">
            <h2>Compare Learnt Songs</h2>
          </div>

          <div className="tab-group compare-tabs">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`tab ${filter === tab.value ? "tab-active" : ""}`}
                onClick={() => setFilter(tab.value)}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <SortControls
            id="user-profile-learnt-sort"
            value={sortBy}
            onChange={setSortBy}
            options={dateSortOptions}
          />

          {sortedSongs.length === 0 ? (
            <p className="empty-state">{emptyMessages[filter]}</p>
          ) : (
            <div className="list list-top">
              {sortedSongs.map((song) => {
                const isTheirs = filter !== "onlyMe";
                const iKnowIt = mySongIds.has(song.songId);

                return (
                  <div key={song.id} className="card-item card-item-compact">
                    <div className="song-row">
                      <SongInfo
                        image={song.image}
                        imageAlt={song.title}
                        title={song.title}
                        meta={[song.artist, song.album]
                          .filter(Boolean)
                          .join(" — ")}
                        extra={
                          song.isCustom ? (
                            <>
                              {song.bandName ? (
                                <>
                                  Custom song from{" "}
                                  <strong>{song.bandName}</strong>
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
                      {isTheirs &&
                        (iKnowIt ? (
                          <span className="compare-badge">You know this</span>
                        ) : !song.isCustom ? (
                          <button
                            onClick={() => handleAddSong(song)}
                            disabled={savingIds.has(song.songId)}
                            className="button button-small button-primary"
                          >
                            {savingIds.has(song.songId) ? "Adding..." : "Add"}
                          </button>
                        ) : null)}
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
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
