"use client";

import { Band } from "@/app/types";

interface BandDetailsTabProps {
  band: Band;
  name: string;
  description: string;
  isSaving: boolean;
  isCreator: boolean;
  showDeleteConfirm: boolean;
  showLeaveConfirm: boolean;
  isDeleting: boolean;
  isLeaving: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onLeave: () => void;
  onShowDeleteConfirm: (show: boolean) => void;
  onShowLeaveConfirm: (show: boolean) => void;
}

export default function BandDetailsTab({
  name,
  description,
  isSaving,
  isCreator,
  showDeleteConfirm,
  showLeaveConfirm,
  isDeleting,
  isLeaving,
  onNameChange,
  onDescriptionChange,
  onSave,
  onDelete,
  onLeave,
  onShowDeleteConfirm,
  onShowLeaveConfirm,
}: BandDetailsTabProps) {
  return (
    <div className="section-block">
      <div className="form-group">
        <label className="label" htmlFor="edit-band-name">
          Band Name
        </label>
        <input
          id="edit-band-name"
          type="text"
          className="input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label className="label" htmlFor="edit-band-desc">
          Description
        </label>
        <textarea
          id="edit-band-desc"
          className="input textarea"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          disabled={isSaving}
        />
      </div>

      <div className="form-actions">
        <button
          className="button button-primary"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div
        className={`band-options${isCreator ? " band-options-creator" : ""}`}
      >
        {showDeleteConfirm ? (
          <div className="confirm-block">
            <p>
              Are you sure? This will permanently delete the band, all setlists,
              and messages.
            </p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                onClick={() => onShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="button button-tertiary button-tertiary-danger"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        ) : showLeaveConfirm ? (
          <div className="confirm-block">
            <p>Are you sure you want to leave this band?</p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                onClick={() => onShowLeaveConfirm(false)}
                disabled={isLeaving}
              >
                Cancel
              </button>
              <button
                className="button button-tertiary button-tertiary-danger"
                onClick={onLeave}
                disabled={isLeaving}
              >
                {isLeaving ? "Leaving..." : "Yes, Leave"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {isCreator && (
              <button
                className="button button-tertiary button-tertiary-danger"
                onClick={() => onShowDeleteConfirm(true)}
              >
                Delete Band
              </button>
            )}
            <button
              className="button button-tertiary button-tertiary-danger"
              onClick={() => onShowLeaveConfirm(true)}
            >
              Leave Band
            </button>
          </>
        )}
      </div>
    </div>
  );
}
