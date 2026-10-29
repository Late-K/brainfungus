"use client";

import { useMemo, useState } from "react";
import AvatarImage from "@/app/components/ui/avatarImage";
import { useRouter } from "next/navigation";
import { ProfileLearntSong, PublicUserProfile } from "@/app/types";
import { compareByDate, safeTimestamp } from "@/app/lib/sortUtils";
import { useFetchData } from "@/app/hooks/useFetchData";
import { useMySongStatuses } from "@/app/hooks/useMySongStatuses";
import ComparableSongRow from "@/app/components/profile/comparableSongRow";
import SongListPreview from "@/app/components/profile/songListPreview";
import SortControls from "@/app/components/ui/sortControls";
import PageLoading from "@/app/components/ui/pageLoading";
import PageErrorCard from "@/app/components/ui/pageErrorCard";
import InviteToBand from "@/app/components/profile/inviteToBand";

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
  const { getMyStatus, mySongIds, savingIds, handleToggle } =
    useMySongStatuses(data);

  const theirSongs = useMemo(() => data?.songs ?? [], [data]);
  const mySongs = useMemo(() => data?.mySongs ?? [], [data]);

  const theirSongIds = useMemo(
    () => new Set(theirSongs.map((s) => s.songId)),
    [theirSongs],
  );

  const commonSongs = theirSongs.filter((s) => mySongIds.has(s.songId));
  const onlyThemSongs = theirSongs.filter((s) => !mySongIds.has(s.songId));
  const onlyMeSongs = mySongs.filter(
    (s) => mySongIds.has(s.songId) && !theirSongIds.has(s.songId),
  );

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

  const { user, isLearntPrivate, isLearningPrivate } = data;
  const firstName = user.name.split(" ")[0];
  const matchPercent = theirSongs.length
    ? Math.round((commonSongs.length / theirSongs.length) * 100)
    : 0;
  const songCounts = [
    !isLearntPrivate &&
      `${theirSongs.length} learnt ${theirSongs.length === 1 ? "song" : "songs"}`,
    !isLearningPrivate && `${data.learningSongs.length} learning`,
  ].filter(Boolean);

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

  const renderSong = (song: ProfileLearntSong) => (
    <ComparableSongRow
      key={song.id}
      song={song}
      myStatus={getMyStatus(song.songId)}
      isSaving={savingIds.has(song.songId)}
      onToggle={handleToggle}
      showAddToSonglist
      sharedBandIds={data?.sharedBandIds}
    />
  );

  // desktop pins the profile and stats on the left with the song lists on the right
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
            <AvatarImage
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
            {songCounts.length > 0 && (
              <p className="meta-text meta-text-medium margin-top">
                {songCounts.join(" · ")}
              </p>
            )}
          </div>
        </div>

        {!isLearntPrivate && (
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

      <div>
        <SongListPreview
          heading="Currently Learning"
          songs={data.learningSongs}
          href={
            data.learningSongs.length > 0
              ? `/users/${user._id}/learning-songs`
              : undefined
          }
          emptyMessage={
            isLearningPrivate ? (
              <>{firstName} keeps the songs they&apos;re learning private.</>
            ) : (
              <>{firstName} isn&apos;t learning any songs right now.</>
            )
          }
        />

        {isLearntPrivate ? (
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
              <div className="list list-top">{sortedSongs.map(renderSong)}</div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
