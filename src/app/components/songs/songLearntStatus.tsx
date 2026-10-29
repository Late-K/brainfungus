"use client";

import { useState } from "react";
import AvatarImage from "@/app/components/ui/avatarImage";
import { AvailUser, LearntMap } from "@/app/types";
import { currentUserLearnt } from "@/app/lib/setlistUtils";
import ExpandedUserList from "@/app/components/ui/expandedUserList";
import { useFittingCount } from "@/app/hooks/useFittingCount";

const avatar_size_px = 24;

// the Mark as Learnt / ✓ Learnt toggle, also used on other people's profiles
export function LearntToggleButton({
  isLearnt,
  isToggling,
  onToggle,
  className,
}: {
  isLearnt: boolean;
  isToggling: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isToggling}
      className={`button button-small ${isLearnt ? "button-learnt" : "button-tertiary"}${className ? ` ${className}` : ""}`}
    >
      {isToggling ? "..." : isLearnt ? "✓ Learnt" : "Mark as Learnt"}
    </button>
  );
}

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
  const [setAvatarsEl, fitCount] = useFittingCount<HTMLDivElement>(
    learners.length,
    avatar_size_px,
  );
  const hiddenCount = learners.length - fitCount;

  return (
    <>
      <div className="learnt-row">
        <LearntToggleButton
          isLearnt={isLearnt}
          isToggling={isToggling}
          onToggle={() => onToggleLearnt(normalisedSongId)}
        />

        {learners.length > 0 && (
          <div className="learnt-avatars" ref={setAvatarsEl}>
            {learners.slice(0, fitCount).map((learner) => (
              <div
                key={learner.userId}
                className="learnt-avatar"
                title={learner.userName}
              >
                {learner.userImage ? (
                  <AvatarImage
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
            {hiddenCount > 0 && (
              <button
                className="available-avatar-more"
                onClick={() => setExpandedLearners(learners)}
                title="Show all"
              >
                +{hiddenCount}
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
