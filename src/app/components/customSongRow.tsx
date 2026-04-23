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
  userName: string | null | undefined;
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
  userName,
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
          <div className="edit-actions">
            <button onClick={onSaveEdit} className="btn btn--primary btn-small">
              Save
            </button>
            <button
              onClick={() => onDelete(song._id)}
              className="btn btn-small btn-danger"
            >
              Delete
            </button>
            <button
              onClick={onCancelEditing}
              className="btn btn--tertiary btn-small"
            >
              Cancel
            </button>
          </div>

          <div className="audio-section">
            <p className="audio-label">Audio</p>
            {song.audioUrl && (
              <div className="audio-current">
                <audio src={song.audioUrl} controls className="audio-player" />
                <button
                  type="button"
                  onClick={() => onDeleteAudio(song._id)}
                  disabled={isUploadingAudio}
                  className="btn btn-small btn--tertiary btn--tertiary-danger"
                >
                  {isUploadingAudio ? "Removing..." : "Remove audio"}
                </button>
              </div>
            )}
            {!song.audioUrl && (
              <label className="audio-upload">
                <input
                  type="file"
                  accept="audio/*"
                  disabled={isUploadingAudio}
                  className="audio-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadAudio(song._id, file);
                    e.target.value = "";
                  }}
                />
                {isUploadingAudio ? "Uploading..." : "Upload audio file"}
              </label>
            )}
            <p className="audio-hint">MP3, WAV, OGG, FLAC — max 8 MB</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={song._id} className="card-item card-item-stack card-item-regular">
      <div className="song-main-row">
        {albumName && albumSongs && indexInAlbum !== undefined && (
          <div className="reorder-buttons">
            <button
              onClick={() =>
                onMoveSong(albumName, albumSongs, indexInAlbum, "up")
              }
              disabled={indexInAlbum === 0}
              className="btn-reorder"
              title="Move up"
            >
              ▲
            </button>
            <button
              onClick={() =>
                onMoveSong(albumName, albumSongs, indexInAlbum, "down")
              }
              disabled={indexInAlbum === albumSongs.length - 1}
              className="btn-reorder"
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
            className="btn btn-small btn--tertiary"
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
        userName={userName}
        togglingIds={togglingIds}
        onToggleLearnt={onToggleLearnt}
      />
    </div>
  );
}
