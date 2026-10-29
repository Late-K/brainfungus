"use client";

// the current user's picture, name and email at the top of their profile,
// with a form to change the name and picture shown to everyone else.
// changes are only sent when the form is saved

import { FormEvent, ReactNode, useState } from "react";
import {
  deleteProfileImageAction,
  resetDisplayNameAction,
  setDisplayNameAction,
  uploadProfileImageAction,
} from "@/app/actions/users";
import { unwrapAction } from "@/app/lib/actionResult";
import { MAX_DISPLAY_NAME_LENGTH } from "@/app/lib/validate";
import { OwnProfile } from "@/app/types";
import AvatarImage from "@/app/components/ui/avatarImage";
import ImageUploadField from "@/app/components/ui/imageUploadField";

export default function ProfileIdentity({
  profile: initialProfile,
  actions,
}: {
  profile: OwnProfile;
  // more buttons shown beside Edit profile
  actions?: ReactNode;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(initialProfile.name);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  // the custom picture is to be removed, going back to the google one
  const [removeImage, setRemoveImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const openEditor = () => {
    setNameInput(profile.name);
    setPendingImage(null);
    setRemoveImage(false);
    setError("");
    setIsEditing(true);
  };

  const saveName = async () => {
    const name = nameInput.replace(/\s+/g, " ").trim();
    if (name === profile.name) return;

    // typing the google name back in is the same as switching back to it
    if (profile.hasCustomName && name === profile.googleName) {
      const result = unwrapAction(await resetDisplayNameAction());
      setProfile((prev) => ({
        ...prev,
        name: result.name ?? "",
        hasCustomName: false,
      }));
      return;
    }

    const result = unwrapAction(await setDisplayNameAction(name));
    // the server keeps the old name as the google one if it had none yet
    setProfile((prev) => ({
      ...prev,
      name: result.name,
      hasCustomName: true,
      googleName:
        prev.googleName ?? (prev.hasCustomName ? undefined : prev.name),
    }));
  };

  const saveImage = async () => {
    if (pendingImage) {
      const formData = new FormData();
      formData.append("image", pendingImage);
      const { image } = unwrapAction(await uploadProfileImageAction(formData));
      setProfile((prev) => ({ ...prev, image, hasCustomImage: true }));
    } else if (removeImage) {
      const { image } = unwrapAction(await deleteProfileImageAction());
      setProfile((prev) => ({
        ...prev,
        image: image ?? undefined,
        hasCustomImage: false,
      }));
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await saveName();
      await saveImage();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageRemove = () => {
    if (pendingImage) {
      setPendingImage(null);
    } else {
      setRemoveImage(true);
    }
  };

  const canRemoveImage =
    !!pendingImage || (profile.hasCustomImage && !removeImage);

  return (
    <>
      <div className="media-row">
        {profile.image ? (
          <AvatarImage
            src={profile.image}
            alt="avatar"
            width={90}
            height={90}
            className="avatar-large"
          />
        ) : (
          <div className="avatar-large placeholder">
            {profile.name.charAt(0).toUpperCase() || "U"}
          </div>
        )}

        <div className="profile-identity-text">
          <h1 className="heading-small">{profile.name || "Unknown user"}</h1>
          <p className="meta-text meta-text-medium margin-top">
            {profile.email}
          </p>
          <div className="profile-identity-actions">
            {!isEditing && (
              <button
                type="button"
                className="button button-small button-tertiary"
                onClick={openEditor}
              >
                Edit profile
              </button>
            )}
            {actions}
          </div>
        </div>
      </div>

      {isEditing && (
        <form className="profile-editor" onSubmit={handleSave}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="label" htmlFor="profile-name">
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              className="input"
              value={nameInput}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={isSaving}
            />
            {profile.hasCustomName &&
              profile.googleName &&
              nameInput.trim() !== profile.googleName && (
                <button
                  type="button"
                  className="button button-small button-tertiary profile-reset-button"
                  onClick={() => setNameInput(profile.googleName ?? "")}
                  disabled={isSaving}
                >
                  Use my Google name ({profile.googleName})
                </button>
              )}
          </div>

          <ImageUploadField
            id="profile-image"
            label="Profile picture"
            note={
              removeImage
                ? "Your Google picture will be used once you save."
                : profile.hasCustomImage
                  ? "Removing your picture goes back to your Google one."
                  : undefined
            }
            currentImage={removeImage ? undefined : profile.image}
            pendingFile={pendingImage}
            disabled={isSaving}
            onSelect={(file) => {
              setPendingImage(file);
              setRemoveImage(false);
            }}
            onRemove={canRemoveImage ? handleImageRemove : undefined}
          />

          <div className="form-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={isSaving || !nameInput.trim()}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
