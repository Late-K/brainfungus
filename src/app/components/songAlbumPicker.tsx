"use client";

interface SongAlbumPickerProps {
  value: string;
  isCustom: boolean;
  existingAlbums: string[];
  onChange: (value: string) => void;
  onCustomToggle: (isCustom: boolean) => void;
  disabled?: boolean;
}

export default function SongAlbumPicker({
  value,
  isCustom,
  existingAlbums,
  onChange,
  onCustomToggle,
  disabled,
}: SongAlbumPickerProps) {
  if (isCustom) {
    return (
      <div className="input-row">
        <input
          type="text"
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter new album name"
          disabled={disabled}
        />
        <button
          type="button"
          className="btn btn-small btn--tertiary"
          onClick={() => {
            onCustomToggle(false);
            onChange("");
          }}
          disabled={disabled}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <select
      className="input"
      value={value}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          onCustomToggle(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      disabled={disabled}
    >
      <option value="">No album</option>
      {existingAlbums.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      <option value="__new__">+ Add new album</option>
    </select>
  );
}
