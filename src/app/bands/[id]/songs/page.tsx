// custom songs page

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useBandSongsPage } from "@/app/hooks/useBandSongsPage";
import CustomSongCreateForm from "@/app/components/songs/customSongCreateForm";
import CustomSongRow from "@/app/components/songs/customSongRow";
import BandSubpageHeader from "@/app/components/bands/bandSubpageHeader";
import SortControls from "@/app/components/ui/sortControls";

const knownSongSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "mostKnown", label: "Most known" },
  { value: "leastKnown", label: "Least known" },
] as const;

export default function SongsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const songsPage = useBandSongsPage(params);
  const songsPrivate = songsPage.band?.customSongsPrivate === true;

  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <div className="page-container">
      <BandSubpageHeader
        title="Songs"
        description="Add and manage custom songs for your band that aren't available on Deezer."
        bandId={songsPage.bandId}
      />

      {/* desktop pins the add form and sorting on the left, song list on the right */}
      <div className="tools-layout">
        <section className="card tools-layout-tools">
          <div className="section-header">
            <h2>Custom Songs</h2>
            <button
              onClick={() => songsPage.setShowForm(!songsPage.showForm)}
              className="button button-primary"
            >
              {songsPage.showForm ? "Cancel" : "+ Add Song"}
            </button>
          </div>

          <SortControls
            id="custom-song-sort"
            value={songsPage.sortBy}
            onChange={songsPage.setSortBy}
            options={knownSongSortOptions}
          />

          {songsPage.error && (
            <p className="alert alert-error">{songsPage.error}</p>
          )}

          {songsPage.showForm && (
            <CustomSongCreateForm
              newTitle={songsPage.newTitle}
              setNewTitle={songsPage.setNewTitle}
              newAlbum={songsPage.newAlbum}
              setNewAlbum={songsPage.setNewAlbum}
              newAlbumIsCustom={songsPage.newAlbumIsCustom}
              setNewAlbumIsCustom={songsPage.setNewAlbumIsCustom}
              newNotes={songsPage.newNotes}
              setNewNotes={songsPage.setNewNotes}
              newAudioFile={songsPage.newAudioFile}
              setNewAudioFile={songsPage.setNewAudioFile}
              newImageFile={songsPage.newImageFile}
              setNewImageFile={songsPage.setNewImageFile}
              newAlbumImageFile={songsPage.newAlbumImageFile}
              setNewAlbumImageFile={songsPage.setNewAlbumImageFile}
              selectedAlbumImage={songsPage.getAlbumImage(songsPage.newAlbum)}
              existingAlbums={songsPage.existingAlbums}
              isSaving={songsPage.isSaving}
              onSubmit={songsPage.handleAddSong}
            />
          )}
        </section>

        <section className="card tools-layout-list">
          <div className="section-header">
            <h2>Song List</h2>
            {songsPage.songs.length > 0 && (
              <span className="accordion-count">
                {songsPage.songs.length} song
                {songsPage.songs.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {songsPage.isLoading ? (
            <p className="empty-state">Loading songs...</p>
          ) : songsPage.songs.length === 0 ? (
            <p className="empty-state">
              No custom songs yet. Create one to get started!
            </p>
          ) : (
            <div className="list">
              {songsPage.albums.map(([albumName, albumSongs]) => {
                const albumImage = songsPage.getAlbumImage(albumName);
                return (
                  <div key={albumName} className="accordion">
                    <button
                      className="accordion-trigger"
                      onClick={() => songsPage.toggleAlbum(albumName)}
                    >
                      <span
                        className={`accordion-icon ${songsPage.expandedAlbums.has(albumName) ? "accordion-icon-open" : ""}`}
                      >
                        &#9654;
                      </span>
                      {albumImage && (
                        <img src={albumImage} alt="" className="accordion-thumb" />
                      )}
                      <span className="accordion-title">{albumName}</span>
                      <span className="accordion-count">
                        {albumSongs.length} song
                        {albumSongs.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                    {songsPage.expandedAlbums.has(albumName) && (
                      <div className="accordion-content">
                        {albumSongs.map((song, idx) => (
                          <CustomSongRow
                            key={song._id}
                            song={song}
                            albumName={albumName}
                            albumSongs={albumSongs}
                            indexInAlbum={idx}
                            isEditing={songsPage.editingId === song._id}
                            existingAlbums={songsPage.existingAlbums}
                            editTitle={songsPage.editTitle}
                            setEditTitle={songsPage.setEditTitle}
                            editNotes={songsPage.editNotes}
                            setEditNotes={songsPage.setEditNotes}
                            editAlbum={songsPage.editAlbum}
                            setEditAlbum={songsPage.setEditAlbum}
                            editAlbumIsCustom={songsPage.editAlbumIsCustom}
                            setEditAlbumIsCustom={songsPage.setEditAlbumIsCustom}
                            learntMap={songsPage.learntMap}
                            learningIds={songsPage.learningIds}
                            userEmail={session.user?.email}
                            togglingIds={songsPage.togglingIds}
                            isUploadingAudio={songsPage.uploadingAudioIds.has(
                              song._id,
                            )}
                            isUploadingImage={songsPage.uploadingImageIds.has(
                              song._id,
                            )}
                            onToggleLearnt={songsPage.handleToggleLearnt}
                            onToggleLearning={songsPage.handleToggleLearning}
                            onMoveSong={songsPage.handleMoveSong}
                            onStartEditing={songsPage.startEditing}
                            onSaveEdit={songsPage.handleSaveEdit}
                            onDelete={songsPage.handleDelete}
                            onCancelEditing={songsPage.cancelEditing}
                            onUploadAudio={songsPage.handleUploadAudio}
                            onDeleteAudio={songsPage.handleDeleteAudio}
                            onUploadImage={songsPage.handleUploadImage}
                            onDeleteImage={songsPage.handleDeleteImage}
                            editAlbumImage={songsPage.getAlbumImage(songsPage.editAlbum)}
                            isUploadingAlbumImage={songsPage.uploadingAlbumImages.has(
                              songsPage.editAlbum,
                            )}
                            onUploadAlbumImage={songsPage.handleUploadAlbumImage}
                            onDeleteAlbumImage={songsPage.handleDeleteAlbumImage}
                            allowReorder
                            songsPrivate={songsPrivate}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {songsPage.looseSongs.map((song) => (
                <CustomSongRow
                  key={song._id}
                  song={song}
                  isEditing={songsPage.editingId === song._id}
                  existingAlbums={songsPage.existingAlbums}
                  editTitle={songsPage.editTitle}
                  setEditTitle={songsPage.setEditTitle}
                  editNotes={songsPage.editNotes}
                  setEditNotes={songsPage.setEditNotes}
                  editAlbum={songsPage.editAlbum}
                  setEditAlbum={songsPage.setEditAlbum}
                  editAlbumIsCustom={songsPage.editAlbumIsCustom}
                  setEditAlbumIsCustom={songsPage.setEditAlbumIsCustom}
                  learntMap={songsPage.learntMap}
                  learningIds={songsPage.learningIds}
                  userEmail={session.user?.email}
                  togglingIds={songsPage.togglingIds}
                  isUploadingAudio={songsPage.uploadingAudioIds.has(song._id)}
                  isUploadingImage={songsPage.uploadingImageIds.has(song._id)}
                  onToggleLearnt={songsPage.handleToggleLearnt}
                  onToggleLearning={songsPage.handleToggleLearning}
                  onMoveSong={songsPage.handleMoveSong}
                  onStartEditing={songsPage.startEditing}
                  onSaveEdit={songsPage.handleSaveEdit}
                  onDelete={songsPage.handleDelete}
                  onCancelEditing={songsPage.cancelEditing}
                  onUploadAudio={songsPage.handleUploadAudio}
                  onDeleteAudio={songsPage.handleDeleteAudio}
                  onUploadImage={songsPage.handleUploadImage}
                  onDeleteImage={songsPage.handleDeleteImage}
                  editAlbumImage={songsPage.getAlbumImage(songsPage.editAlbum)}
                  isUploadingAlbumImage={songsPage.uploadingAlbumImages.has(
                    songsPage.editAlbum,
                  )}
                  onUploadAlbumImage={songsPage.handleUploadAlbumImage}
                  onDeleteAlbumImage={songsPage.handleDeleteAlbumImage}
                  songsPrivate={songsPrivate}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
