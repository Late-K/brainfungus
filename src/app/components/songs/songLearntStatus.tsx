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

// sits next to the learnt toggle. a learnt song can be put back into
// learning if it's been forgotten, which takes it off the learnt songs
export function LearningToggleButton({
  isLearning,
  isLearnt,
  isToggling,
  onToggle,
  className,
}: {
  isLearning: boolean;
  isLearnt: boolean;
  isToggling: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isToggling}
      title={isLearnt ? "Move back to learning" : undefined}
      className={`button button-small ${isLearning ? "button-learning" : "button-tertiary"}${className ? ` ${className}` : ""}`}
    >
      {isToggling
        ? "..."
        : isLearning
          ? "✓ Learning"
          : isLearnt
            ? "Relearn"
            : "Start Learning"}
    </button>
  );
}

interface SongLearntStatusProps {
  songId: string;
  learntMap: LearntMap;
  learningIds: Set<string>;
  userEmail: string | null | undefined;
  togglingIds: Set<string>;
  onToggleLearnt: (songId: string) => void;
  onToggleLearning: (songId: string) => void;
}

export default function SongLearntStatus({
  songId,
  learntMap,
  learningIds,
  userEmail,
  togglingIds,
  onToggleLearnt,
  onToggleLearning,
}: SongLearntStatusProps) {
  const [expandedLearners, setExpandedLearners] = useState<AvailUser[] | null>(
    null,
  );

  const normalisedSongId = String(songId);
  const learners = learntMap[normalisedSongId] || [];
  const isLearnt = currentUserLearnt(normalisedSongId, learntMap, userEmail);
  const isLearning = learningIds.has(normalisedSongId);
  const isToggling = togglingIds.has(normalisedSongId);
  const [setAvatarsEl, fitCount] = useFittingCount<HTMLDivElement>(
    learners.length,
    avatar_size_px,
  );
  const hiddenCount = learners.length - fitCount;

  return (
    <>
      <div className="learnt-row">
        {/* learnt sits next to the avatars of who has learnt the song */}
        <LearningToggleButton
          isLearning={isLearning}
          isLearnt={isLearnt}
          isToggling={isToggling}
          onToggle={() => onToggleLearning(normalisedSongId)}
        />
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
