"use client";

import { useState } from "react";
import Image from "next/image";
import { AvailUser, LearntMap } from "@/app/types";
import { currentUserLearnt } from "@/app/lib/setlistUtils";
import ExpandedUserList from "@/app/components/expandedUserList";

const MAX_VISIBLE_AVATARS = 5;

interface SongLearntStatusProps {
  songId: string;
  learntMap: LearntMap;
  userName: string | null | undefined;
  togglingIds: Set<string>;
  onToggleLearnt: (songId: string) => void;
}

export default function SongLearntStatus({
  songId,
  learntMap,
  userName,
  togglingIds,
  onToggleLearnt,
}: SongLearntStatusProps) {
  const [expandedLearners, setExpandedLearners] = useState<AvailUser[] | null>(
    null,
  );

  const normalisedSongId = String(songId);
  const learners = learntMap[normalisedSongId] || [];
  const isLearnt = currentUserLearnt(normalisedSongId, learntMap, userName);
  const isToggling = togglingIds.has(normalisedSongId);

  return (
    <>
      <div className="learnt-row">
        <button
          onClick={() => onToggleLearnt(normalisedSongId)}
          disabled={isToggling}
          className={`btn btn-small ${isLearnt ? "btn--learnt" : "btn--tertiary"}`}
        >
          {isToggling ? "..." : isLearnt ? "✓ Learnt" : "Mark as Learnt"}
        </button>

        {learners.length > 0 && (
          <div className="learnt-avatars">
            {learners.slice(0, MAX_VISIBLE_AVATARS).map((learner) => (
              <div
                key={learner.userId}
                className="learnt-avatar"
                title={learner.userName}
              >
                {learner.userImage ? (
                  <Image
                    src={learner.userImage}
                    alt={learner.userName}
                    width={24}
                    height={24}
                    className="learnt-avatar-img"
                  />
                ) : (
                  <span className="learnt-avatar-fallback">
                    {learner.userName?.charAt(0) || "?"}
                  </span>
                )}
              </div>
            ))}
            {learners.length > MAX_VISIBLE_AVATARS && (
              <button
                className="available-avatar-more"
                onClick={() => setExpandedLearners(learners)}
                title="Show all"
              >
                +{learners.length - MAX_VISIBLE_AVATARS}
              </button>
            )}
          </div>
        )}
      </div>

      {expandedLearners && (
        <ExpandedUserList
          title="Learnt By"
          users={expandedLearners}
          onClose={() => setExpandedLearners(null)}
          avatarVariant="learnt"
        />
      )}
    </>
  );
}
