"use client";

import AvatarImage from "@/app/components/ui/avatarImage";
import { AvailUser } from "@/app/types";
import { useFittingCount } from "@/app/hooks/useFittingCount";

const avatar_size_px = 24;

interface AvailableUsersRowProps {
  users: AvailUser[];
  onShowAll?: (users: AvailUser[]) => void;
  label?: string;
}

export default function AvailableUsersRow({
  users,
  onShowAll,
  label = "Available:",
}: AvailableUsersRowProps) {
  const [setAvatarsEl, fitCount] = useFittingCount<HTMLDivElement>(
    users.length,
    avatar_size_px,
  );
  if (users.length === 0) return null;

  const visible = users.slice(0, fitCount);
  const extra = users.length - fitCount;

  return (
    <div className="avatar-row">
      <span className="avatar-row-label">{label}</span>
      <div className="available-avatars" ref={setAvatarsEl}>
        {visible.map((u) => (
          <div key={u.userId} className="available-avatar" title={u.userName}>
            {u.userImage ? (
              <AvatarImage
                src={u.userImage}
                alt={u.userName}
                width={24}
                height={24}
                className="available-avatar-img"
              />
            ) : (
              <span className="available-avatar-fallback">
                {u.userName?.charAt(0) || "?"}
              </span>
            )}
          </div>
        ))}
        {extra > 0 && onShowAll && (
          <button
            className="available-avatar-more"
            onClick={() => onShowAll(users)}
            title="Show all"
          >
            +{extra}
          </button>
        )}
      </div>
    </div>
  );
}
