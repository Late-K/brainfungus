"use client";

import Image from "next/image";

export type UserInfo = { userId: string; userName: string; userImage?: string };

interface ExpandedUserListProps {
  title: string;
  users: UserInfo[];
  onClose: () => void;
  avatarVariant?: "available" | "learnt";
}

export default function ExpandedUserList({
  title,
  users,
  onClose,
  avatarVariant = "available",
}: ExpandedUserListProps) {
  const avatarClass =
    avatarVariant === "learnt" ? "learnt-avatar" : "available-avatar";
  const imgClass =
    avatarVariant === "learnt" ? "learnt-avatar-img" : "available-avatar-img";
  const fallbackClass =
    avatarVariant === "learnt"
      ? "learnt-avatar-fallback"
      : "available-avatar-fallback";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="mgmt-header">
          <h3>{title}</h3>
          <button className="btn btn-small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="expanded-users-list">
          {users.map((u) => (
            <div key={u.userId} className="expanded-user-item">
              <div className={avatarClass}>
                {u.userImage ? (
                  <Image
                    src={u.userImage}
                    alt={u.userName}
                    width={24}
                    height={24}
                    className={imgClass}
                  />
                ) : (
                  <span className={fallbackClass}>
                    {u.userName?.charAt(0) || "?"}
                  </span>
                )}
              </div>
              <span>{u.userName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
