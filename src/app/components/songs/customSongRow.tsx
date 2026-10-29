"use client";

import { Dispatch, SetStateAction } from "react";
import { CustomSong, LearntMap } from "@/app/types";
import SongLearntStatus from "@/app/components/songs/songLearntStatus";
import SongAlbumPicker from "@/app/components/songs/songAlbumPicker";
import AddToSonglist from "@/app/components/songs/addToSonglist";
import ImageUploadField from "@/app/components/ui/imageUploadField";

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
  learningIds: Set<string>;
  userEmail: string | null | undefined;
  togglingIds: Set<string>;
  isUploadingAudio: boolean;
  isUploadingImage: boolean;
  // image of the album picked in the edit form
  editAlbumImage?: string;
  isUploadingAlbumImage: boolean;
  onToggleLearnt: (songId: string) => void;
  onToggleLearning: (songId: string) => void;
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
  onUploadImage: (songId: string, file: File) => void;
  onDeleteImage: (songId: string) => void;
  onUploadAlbumImage: (albumName: string, file: File) => void;
  onDeleteAlbumImage: (albumName: string) => void;
  allowReorder?: boolean;
  // whether the band keeps its custom songs out of other bands' setlists
  songsPrivate?: boolean;
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
  learningIds,
  userEmail,
  togglingIds,
  isUploadingAudio,
  isUploadingImage,
  editAlbumImage,
  isUploadingAlbumImage,
  onToggleLearnt,
  onToggleLearning,
  onMoveSong,
  onStartEditing,
  onSaveEdit,
  onDelete,
  onCancelEditing,
  onUploadAudio,
  onDeleteAudio,
  onUploadImage,
  onDeleteImage,
  onUploadAlbumImage,
  onDeleteAlbumImage,
  allowReorder = false,
  songsPrivate = false,
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
          {editAlbum.trim() && (
            <ImageUploadField
              id={`editAlbumImage-${song._id}`}
              label="Album Image"
              note={`Shared by every song in ${editAlbum}`}
              currentImage={editAlbumImage}
              isBusy={isUploadingAlbumImage}
              onSelect={(file) => onUploadAlbumImage(editAlbum, file)}
              onRemove={() => onDeleteAlbumImage(editAlbum)}
            />
          )}
          <ImageUploadField
            id={`editSongImage-${song._id}`}
            label="Song Image"
            currentImage={song.image}
            isBusy={isUploadingImage}
            onSelect={(file) => onUploadImage(song._id, file)}
            onRemove={() => onDeleteImage(song._id)}
          />
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
              <label htmlFor={`editSongAudio-${song._id}`}>Audio File</label>
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
              className="button button-small button-tertiary button-tertiary-danger"
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

        {(song.image || song.albumImage) && (
          <img
            src={song.image || song.albumImage}
            alt=""
            className="song-thumbnail"
          />
        )}

        <div className="song-info">
          <h3 className="item-title">{song.title}</h3>
          {song.notes && (
            <p className="meta-text meta-text-small margin-top">{song.notes}</p>
          )}
        </div>

        <div className="inline-actions-small">
          <AddToSonglist
            song={{
              id: song._id,
              title: song.title,
              album: song.album,
              duration: song.duration ?? 0,
              isCustom: true,
              bandId: song.bandId,
            }}
            bandId={song.bandId}
            onlyBandId={songsPrivate ? song.bandId : undefined}
          />
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
        learningIds={learningIds}
        userEmail={userEmail}
        togglingIds={togglingIds}
        onToggleLearnt={onToggleLearnt}
        onToggleLearning={onToggleLearning}
      />
    </div>
  );
}
