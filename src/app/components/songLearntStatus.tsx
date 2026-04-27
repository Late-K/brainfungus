"use client";

import { useState } from "react";
import Image from "next/image";
import { AvailUser, LearntMap } from "@/app/types";
import { currentUserLearnt } from "@/app/lib/setlistUtils";
import ExpandedUserList from "@/app/components/expandedUserList";

const max_visible_avatars = 5;

interface SongLearntStatusProps {
  songId: string;
  learntMap: LearntMap;
  userEmail: string | null | undefined;
  togglingIds: Set<string>;
  onToggleLearnt: (songId: string) => void;
}

export default function SongLearntStatus({
  songId,
  learntMap,
  userEmail,
  togglingIds,
  onToggleLearnt,
}: SongLearntStatusProps) {
  const [expandedLearners, setExpandedLearners] = useState<AvailUser[] | null>(
    null,
  );

  const normalisedSongId = String(songId);
  const learners = learntMap[normalisedSongId] || [];
  const isLearnt = currentUserLearnt(normalisedSongId, learntMap, userEmail);
  const isToggling = togglingIds.has(normalisedSongId);

  return (
    <>
      <div className="learnt-row">
        <button
          onClick={() => onToggleLearnt(normalisedSongId)}
          disabled={isToggling}
          className={`button button-small ${isLearnt ? "button-learnt" : "button-tertiary"}`}
        >
          {isToggling ? "..." : isLearnt ? "✓ Learnt" : "Mark as Learnt"}
        </button>

        {learners.length > 0 && (
          <div className="learnt-avatars">
            {learners.slice(0, max_visible_avatars).map((learner) => (
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
            {learners.length > max_visible_avatars && (
              <button
                className="available-avatar-more"
                onClick={() => setExpandedLearners(learners)}
                title="Show all"
              >
                +{learners.length - max_visible_avatars}
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
