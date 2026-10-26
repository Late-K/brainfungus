"use client";

import { ChangeEvent } from "react";
import Image from "next/image";

interface UserCardProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export default function UserCard({
  user,
  selectable = false,
  isSelected = false,
  onSelect,
}: UserCardProps) {
  const checkboxId = `user-${user.id}`;

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSelect?.(e.target.checked);
  };

  const content = (
    <div className="user-card-inner">
      <div className="user-card-avatar-wrap">
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={user.name}
            width={48}
            height={48}
            className="user-card-avatar"
          />
        ) : (
          <div className="user-card-avatar-fallback">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="user-card-content">
        <p className="user-card-name">{user.name}</p>
      </div>

      {selectable && (
        <div className="user-card-checkbox-wrap">
          <input
            id={checkboxId}
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="user-card-checkbox"
          />
        </div>
      )}
    </div>
  );

  if (selectable) {
    return (
      <label
        className={`user-card ${isSelected ? "selected" : ""}`}
        htmlFor={checkboxId}
      >
        {content}
      </label>
    );
  }

  return <section className="user-card">{content}</section>;
}
