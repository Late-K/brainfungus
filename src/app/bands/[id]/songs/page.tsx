// custom songs page

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useBandSongsPage } from "@/app/hooks/useBandSongsPage";
import CustomSongCreateForm from "@/app/components/customSongCreateForm";
import CustomSongRow from "@/app/components/customSongRow";

export default function SongsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const songsPage = useBandSongsPage(params);

  if (!session) redirect("/login");

  return (
    <div>
      <Link href={`/bands/${songsPage.bandId}`} className="back-link">
        ← Back to {songsPage.band?.name || "Band"}
      </Link>

      <section className="card">
        <div className="section-header">
          <h2>Custom Songs</h2>
          <button
            onClick={() => songsPage.setShowForm(!songsPage.showForm)}
            className="btn btn--primary"
          >
            {songsPage.showForm ? "Cancel" : "+ Add Song"}
          </button>
        </div>

        {songsPage.error && (
          <p className="alert alert--error">{songsPage.error}</p>
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
            existingAlbums={songsPage.existingAlbums}
            isSaving={songsPage.isSaving}
            onSubmit={songsPage.handleAddSong}
          />
        )}

        {songsPage.isLoading ? (
          <p className="empty-state">Loading songs...</p>
        ) : songsPage.songs.length === 0 ? (
          <p className="empty-state">
            No custom songs yet. Create one to get started!
          </p>
        ) : (
          <div className="songs-list">
            {songsPage.albums.map(([albumName, albumSongs]) => (
              <div key={albumName} className="album-group">
                <button
                  className="album-header"
                  onClick={() => songsPage.toggleAlbum(albumName)}
                >
                  <span
                    className={`album-arrow ${songsPage.expandedAlbums.has(albumName) ? "album-arrow--open" : ""}`}
                  >
                    &#9654;
                  </span>
                  <span className="album-name">{albumName}</span>
                  <span className="album-count">
                    {albumSongs.length} song
                    {albumSongs.length !== 1 ? "s" : ""}
                  </span>
                </button>
                {songsPage.expandedAlbums.has(albumName) && (
                  <div className="album-songs">
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
                        userName={session.user?.name}
                        togglingIds={songsPage.togglingIds}
                        isUploadingAudio={songsPage.uploadingAudioIds.has(
                          song._id,
                        )}
                        onToggleLearnt={songsPage.handleToggleLearnt}
                        onMoveSong={songsPage.handleMoveSong}
                        onStartEditing={songsPage.startEditing}
                        onSaveEdit={songsPage.handleSaveEdit}
                        onDelete={songsPage.handleDelete}
                        onCancelEditing={songsPage.cancelEditing}
                        onUploadAudio={songsPage.handleUploadAudio}
                        onDeleteAudio={songsPage.handleDeleteAudio}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

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
                userName={session.user?.name}
                togglingIds={songsPage.togglingIds}
                isUploadingAudio={songsPage.uploadingAudioIds.has(song._id)}
                onToggleLearnt={songsPage.handleToggleLearnt}
                onMoveSong={songsPage.handleMoveSong}
                onStartEditing={songsPage.startEditing}
                onSaveEdit={songsPage.handleSaveEdit}
                onDelete={songsPage.handleDelete}
                onCancelEditing={songsPage.cancelEditing}
                onUploadAudio={songsPage.handleUploadAudio}
                onDeleteAudio={songsPage.handleDeleteAudio}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
