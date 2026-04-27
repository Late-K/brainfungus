"use client";

import { useEffect, useState } from "react";
import { createBandAction } from "@/app/actions/bands";
import UserCard from "@/app/components/usercard";
import { User } from "@/app/types";

interface BandFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function BandForm({
  onSuccess,
  onCancel,
  submitLabel = "Create Band",
}: BandFormProps) {
  const [bandName, setBandName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        setIsFetchingUsers(true);
        setError("");

        const res = await fetch("/api/users/all");
        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }

        const data = await res.json();
        setAvailableUsers(data.users ?? []);
      } catch (err) {
        setError("Failed to load users");
      } finally {
        setIsFetchingUsers(false);
      }
    }

    fetchUsers();
  }, []);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const resetForm = () => {
    setBandName("");
    setDescription("");
    setSelectedUsers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!bandName.trim()) {
      setError("Band name is required");
      setIsSubmitting(false);
      return;
    }

    try {
      await createBandAction(
        bandName.trim(),
        description.trim(),
        selectedUsers,
      );

      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="label" htmlFor="band-name">
          Band Name*
        </label>
        <input
          id="band-name"
          type="text"
          value={bandName}
          onChange={(e) => setBandName(e.target.value)}
          className="input"
          placeholder="Enter your band name"
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label className="label" htmlFor="band-description">
          Description
        </label>
        <textarea
          id="band-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input textarea"
          placeholder="Describe your band (optional)"
          rows={4}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label className="label">Add Members ({selectedUsers.length})</label>

        <div className="user-select-panel">
          {isFetchingUsers ? (
            <p className="empty-state">Loading users...</p>
          ) : availableUsers.length > 0 ? (
            <div className="user-card-list">
              {availableUsers.map((user) => (
                <UserCard
                  key={user._id}
                  user={{
                    id: user._id,
                    name: user.name,
                    avatar: user.image,
                  }}
                  selectable
                  isSelected={selectedUsers.includes(user._id)}
                  onSelect={(selected) => {
                    setSelectedUsers((prev) =>
                      selected
                        ? [...prev, user._id]
                        : prev.filter((id) => id !== user._id),
                    );
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="empty-state">No other users found</p>
          )}
        </div>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="button button-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="button button-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
