"use client";

import { useEffect, useState } from "react";
import { createBandAction, uploadBandImageAction } from "@/app/actions/bands";
import UserCard from "@/app/components/ui/userCard";
import ImageUploadField from "@/app/components/ui/imageUploadField";
import { User } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

interface CreateBandFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function CreateBandForm({
  onSuccess,
  onCancel,
  submitLabel = "Create Band",
}: CreateBandFormProps) {
  const [bandName, setBandName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
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
      } catch {
        setError("Failed to load users");
      } finally {
        setIsFetchingUsers(false);
      }
    }

    fetchUsers();
  }, []);

  const resetForm = () => {
    setBandName("");
    setDescription("");
    setImageFile(null);
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
      const { bandId } = unwrapAction(
        await createBandAction(
          bandName.trim(),
          description.trim(),
          selectedUsers,
        ),
      );

      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append("image", imageFile);
          unwrapAction(await uploadBandImageAction(bandId, formData));
        } catch (uploadErr) {
          // the band still exists, so let them know and carry on
          alert(
            uploadErr instanceof Error
              ? `${uploadErr.message}. Band was created without its image.`
              : "Band created, but image upload failed.",
          );
        }
      }

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

      <ImageUploadField
        id="band-image"
        label="Band Image"
        note="Optional - you can change this later in band settings"
        pendingFile={imageFile}
        disabled={isSubmitting}
        onSelect={setImageFile}
        onRemove={() => setImageFile(null)}
      />

      <div className="form-group">
        <label className="label">Invite Members ({selectedUsers.length})</label>
        <p className="audio-hint image-field-note">
          They&apos;ll join the band once they accept their invite
        </p>

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
