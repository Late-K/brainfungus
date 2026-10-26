"use client";

import Image from "next/image";
import { AvailUser } from "@/app/types";

interface AvailableUsersRowProps {
  users: AvailUser[];
  maxVisible?: number;
  onShowAll?: (users: AvailUser[]) => void;
}

export default function AvailableUsersRow({
  users,
  maxVisible = 5,
  onShowAll,
}: AvailableUsersRowProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const extra = users.length - maxVisible;

  return (
    <div className="avatar-row">
      <span className="avatar-row-label">Available:</span>
      <div className="available-avatars">
        {visible.map((u) => (
          <div key={u.userId} className="available-avatar" title={u.userName}>
            {u.userImage ? (
              <Image
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
