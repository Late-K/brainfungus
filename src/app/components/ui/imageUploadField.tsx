"use client";

// optional image picker with a preview. shows either an image that is already
// uploaded, or a picked file that will be uploaded when the form is saved

import { useEffect, useMemo, useRef } from "react";

interface ImageUploadFieldProps {
  id: string;
  label: string;
  note?: string;
  currentImage?: string;
  pendingFile?: File | null;
  isBusy?: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
}

export default function ImageUploadField({
  id,
  label,
  note,
  currentImage,
  pendingFile,
  isBusy = false,
  disabled = false,
  onSelect,
  onRemove,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingPreview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : undefined),
    [pendingFile],
  );

  // free the temporary preview url when the picked file changes
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const preview = pendingPreview ?? currentImage;

  const handleRemove = () => {
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  };

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {note && <p className="audio-hint image-field-note">{note}</p>}
      <div className="image-field">
        {preview && <img src={preview} alt="" className="image-field-preview" />}
        <div className="image-field-controls">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="input"
            disabled={disabled || isBusy}
            onClick={(e) => {
              // lets the same file be picked again after removing it
              e.currentTarget.value = "";
            }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSelect(file);
            }}
          />
          {preview && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isBusy}
              className="button button-small button-tertiary button-tertiary-danger"
            >
              Remove image
            </button>
          )}
          <p className="audio-hint">
            {isBusy ? "Uploading..." : "JPG, PNG, WebP or GIF - max 4 MB"}
          </p>
        </div>
      </div>
    </div>
  );
}
