"use client";

import { useState } from "react";
import { PublicUserProfile } from "@/app/types";
import { compareByDate, safeTimestamp } from "@/app/lib/sortUtils";
import { useFetchData } from "@/app/hooks/useFetchData";
import { useMySongStatuses } from "@/app/hooks/useMySongStatuses";
import ComparableSongRow from "@/app/components/profile/comparableSongRow";
import PageHeader from "@/app/components/ui/pageHeader";
import SortControls from "@/app/components/ui/sortControls";
import PageLoading from "@/app/components/ui/pageLoading";
import PageErrorCard from "@/app/components/ui/pageErrorCard";

type DateSort = "newest" | "oldest";

const dateSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

// every song another user is learning, opened from the preview on their profile
export default function UserLearningSongs({ userId }: { userId: string }) {
  const { data, isLoading, error } = useFetchData<PublicUserProfile>(
    `/api/users/${userId}`,
  );
  const { getMyStatus, savingIds, handleToggle } = useMySongStatuses(data);
  const [sortBy, setSortBy] = useState<DateSort>("newest");

  if (isLoading) {
    return <PageLoading message="Loading songs..." />;
  }

  if (error || !data) {
    return (
      <PageErrorCard
        error={
          /\((400|404)\)/.test(error)
            ? "User not found"
            : error || "Failed to load songs"
        }
        backHref="/profile"
        backLabel="Back to Profile"
      />
    );
  }

  const firstName = data.user.name.split(" ")[0];
  const sortedSongs = [...data.learningSongs].sort((a, b) =>
    compareByDate(
      safeTimestamp(a.createdAt),
      safeTimestamp(b.createdAt),
      sortBy,
    ),
  );

  return (
    <>
      <PageHeader
        title={`${firstName} is Learning`}
        description={`Songs ${data.user.name} is learning right now.`}
        backHref={`/users/${userId}`}
        backLabel={`Back to ${firstName}`}
      />

      <section className="card">
        {data.isLearningPrivate ? (
          <p className="empty-state">
            {firstName} keeps the songs they&apos;re learning private.
          </p>
        ) : sortedSongs.length === 0 ? (
          <p className="empty-state">
            {firstName} isn&apos;t learning any songs right now.
          </p>
        ) : (
          <>
            <SortControls
              id="user-learning-sort"
              value={sortBy}
              onChange={setSortBy}
              options={dateSortOptions}
            />
            <div className="list list-top">
              {sortedSongs.map((song) => (
                <ComparableSongRow
                  key={song.id}
                  song={song}
                  myStatus={getMyStatus(song.songId)}
                  isSaving={savingIds.has(song.songId)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
