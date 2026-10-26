"use client";

import { Dispatch, FormEvent, SetStateAction } from "react";
import SongAlbumPicker from "@/app/components/songs/songAlbumPicker";
import ImageUploadField from "@/app/components/ui/imageUploadField";

interface CustomSongCreateFormProps {
  newTitle: string;
  setNewTitle: Dispatch<SetStateAction<string>>;
  newAlbum: string;
  setNewAlbum: Dispatch<SetStateAction<string>>;
  newAlbumIsCustom: boolean;
  setNewAlbumIsCustom: Dispatch<SetStateAction<boolean>>;
  newNotes: string;
  setNewNotes: Dispatch<SetStateAction<string>>;
  newAudioFile: File | null;
  setNewAudioFile: Dispatch<SetStateAction<File | null>>;
  newImageFile: File | null;
  setNewImageFile: Dispatch<SetStateAction<File | null>>;
  newAlbumImageFile: File | null;
  setNewAlbumImageFile: Dispatch<SetStateAction<File | null>>;
  // image the picked album already has, if any
  selectedAlbumImage?: string;
  existingAlbums: string[];
  isSaving: boolean;
  onSubmit: (e: FormEvent) => void;
}

export default function CustomSongCreateForm({
  newTitle,
  setNewTitle,
  newAlbum,
  setNewAlbum,
  newAlbumIsCustom,
  setNewAlbumIsCustom,
  newNotes,
  setNewNotes,
  newAudioFile,
  setNewAudioFile,
  newImageFile,
  setNewImageFile,
  newAlbumImageFile,
  setNewAlbumImageFile,
  selectedAlbumImage,
  existingAlbums,
  isSaving,
  onSubmit,
}: CustomSongCreateFormProps) {
  return (
    <form onSubmit={onSubmit} className="form-section">
      <div className="form-group">
        <label htmlFor="songTitle">Song Title *</label>
        <input
          id="songTitle"
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Enter song title"
          className="input"
          disabled={isSaving}
        />
      </div>
      <div className="form-group">
        <label>Album</label>
        <SongAlbumPicker
          value={newAlbum}
          isCustom={newAlbumIsCustom}
          existingAlbums={existingAlbums}
          onChange={setNewAlbum}
          onCustomToggle={setNewAlbumIsCustom}
          disabled={isSaving}
        />
      </div>
      {newAlbum.trim() && (
        <ImageUploadField
          id="albumImage"
          label="Album Image"
          currentImage={selectedAlbumImage}
          pendingFile={newAlbumImageFile}
          disabled={isSaving}
          onSelect={setNewAlbumImageFile}
          onRemove={
            newAlbumImageFile ? () => setNewAlbumImageFile(null) : undefined
          }
        />
      )}
      <ImageUploadField
        id="songImage"
        label="Song Image"
        pendingFile={newImageFile}
        disabled={isSaving}
        onSelect={setNewImageFile}
        onRemove={() => setNewImageFile(null)}
      />
      <div className="form-group">
        <label htmlFor="songNotes">Notes</label>
        <textarea
          id="songNotes"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="Add relevant notes about the song..."
          className="input textarea"
          rows={3}
          disabled={isSaving}
        />
      </div>
      <div className="form-group">
        <label htmlFor="songAudio">Audio File</label>
        <input
          id="songAudio"
          type="file"
          accept="audio/*"
          className="input"
          disabled={isSaving}
          onChange={(e) => setNewAudioFile(e.target.files?.[0] || null)}
        />
        {newAudioFile && (
          <p className="audio-hint">Selected: {newAudioFile.name}</p>
        )}
        <p className="audio-hint">MP3, WAV, OGG, FLAC - max 8 MB</p>
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="button button-primary"
      >
        {isSaving ? "Creating..." : "Create Song"}
      </button>
    </form>
  );
}
