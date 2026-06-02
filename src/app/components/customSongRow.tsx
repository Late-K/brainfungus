"use client";

import { Dispatch, SetStateAction } from "react";
import { CustomSong, LearntMap } from "@/app/types";
import SongLearntStatus from "@/app/components/songLearntStatus";
import SongAlbumPicker from "@/app/components/songAlbumPicker";

interface CustomSongRowProps {
  song: CustomSong;
  albumName?: string;
  albumSongs?: CustomSong[];
  indexInAlbum?: number;
  isEditing: boolean;
  existingAlbums: string[];
  editTitle: string;
  setEditTitle: Dispatch<SetStateAction<string>>;
  editNotes: string;
  setEditNotes: Dispatch<SetStateAction<string>>;
  editAlbum: string;
  setEditAlbum: Dispatch<SetStateAction<string>>;
  editAlbumIsCustom: boolean;
  setEditAlbumIsCustom: Dispatch<SetStateAction<boolean>>;
  learntMap: LearntMap;
  userEmail: string | null | undefined;
  togglingIds: Set<string>;
  isUploadingAudio: boolean;
  onToggleLearnt: (songId: string) => void;
  onMoveSong: (
    album: string,
    albumSongs: CustomSong[],
    index: number,
    direction: "up" | "down",
  ) => void;
  onStartEditing: (song: CustomSong) => void;
  onSaveEdit: () => void;
  onDelete: (songId: string) => void;
  onCancelEditing: () => void;
  onUploadAudio: (songId: string, file: File) => void;
  onDeleteAudio: (songId: string) => void;
  allowReorder?: boolean;
}

export default function CustomSongRow({
  song,
  albumName,
  albumSongs,
  indexInAlbum,
  isEditing,
  existingAlbums,
  editTitle,
  setEditTitle,
  editNotes,
  setEditNotes,
  editAlbum,
  setEditAlbum,
  editAlbumIsCustom,
  setEditAlbumIsCustom,
  learntMap,
  userEmail,
  togglingIds,
  isUploadingAudio,
  onToggleLearnt,
  onMoveSong,
  onStartEditing,
  onSaveEdit,
  onDelete,
  onCancelEditing,
  onUploadAudio,
  onDeleteAudio,
  allowReorder = false,
}: CustomSongRowProps) {
  if (isEditing) {
    return (
      <div
        key={song._id}
        className="card-item card-item-stack card-item-regular song-item-editing"
      >
        <div className="edit-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              className="input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Album</label>
            <SongAlbumPicker
              value={editAlbum}
              isCustom={editAlbumIsCustom}
              existingAlbums={existingAlbums}
              onChange={setEditAlbum}
              onCustomToggle={setEditAlbumIsCustom}
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="input textarea"
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
          <div className="audio-section">
            {song.audioUrl && (
              <div className="audio-current">
                <audio src={song.audioUrl} controls className="audio-player" />
                <button
                  type="button"
                  onClick={() => onDeleteAudio(song._id)}
                  disabled={isUploadingAudio}
                  className="button button-small button-tertiary button-tertiary-danger"
                >
                  {isUploadingAudio ? "Removing..." : "Remove audio"}
                </button>
              </div>
            )}
            <div className="form-group">
              <label htmlFor={`editSongAudio-${song._id}`}>
                Audio File (optional)
              </label>
              <input
                id={`editSongAudio-${song._id}`}
                type="file"
                accept="audio/*"
                className="input"
                disabled={isUploadingAudio}
                onClick={(e) => {
                  e.currentTarget.value = "";
                }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadAudio(song._id, file);
                }}
              />
              <p className="audio-hint">
                {isUploadingAudio
                  ? "Uploading..."
                  : "MP3, WAV, OGG, FLAC - max 8 MB"}
              </p>
            </div>
          </div>

          <div className="edit-actions">
            <button
              onClick={onSaveEdit}
              className="button button-primary button-small"
            >
              Save
            </button>
            <button
              onClick={() => onDelete(song._id)}
              className="button button-small button-danger"
            >
              Delete
            </button>
            <button
              onClick={onCancelEditing}
              className="button button-tertiary button-small"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={song._id} className="card-item card-item-stack card-item-regular">
      <div className="song-main-row">
        {allowReorder &&
          albumName &&
          albumSongs &&
          indexInAlbum !== undefined && (
            <div className="reorder-buttons">
              <button
                onClick={() =>
                  onMoveSong(albumName, albumSongs, indexInAlbum, "up")
                }
                disabled={indexInAlbum === 0}
                className="button-reorder"
                title="Move up"
              >
                ▲
              </button>
              <button
                onClick={() =>
                  onMoveSong(albumName, albumSongs, indexInAlbum, "down")
                }
                disabled={indexInAlbum === albumSongs.length - 1}
                className="button-reorder"
                title="Move down"
              >
                ▼
              </button>
            </div>
          )}

        <div className="song-info">
          <h3 className="item-title">{song.title}</h3>
          {song.notes && (
            <p className="meta-text meta-text-small margin-top">{song.notes}</p>
          )}
        </div>

        <div className="inline-actions-small">
          <button
            onClick={() => onStartEditing(song)}
            className="button button-small button-tertiary"
          >
            Edit
          </button>
        </div>
      </div>

      {song.audioUrl && (
        <div className="audio-view">
          <audio src={song.audioUrl} controls className="audio-player" />
        </div>
      )}

      <SongLearntStatus
        songId={song._id}
        learntMap={learntMap}
        userEmail={userEmail}
        togglingIds={togglingIds}
        onToggleLearnt={onToggleLearnt}
      />
    </div>
  );
}
