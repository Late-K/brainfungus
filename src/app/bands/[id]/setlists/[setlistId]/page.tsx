// selected setlist page

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import SetlistEditMode from "@/app/components/setlists/setlistEditMode";
import SetlistViewMode from "@/app/components/setlists/setlistViewMode";
import { useSetlistDetailPage } from "@/app/hooks/useSetlistDetailPage";

export default function SetlistDetailPage({
  params,
}: {
  params: Promise<{ id: string; setlistId: string }>;
}) {
  const { data: session, status } = useSession();
  const setlistDetailPage = useSetlistDetailPage(params);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  if (setlistDetailPage.isLoading) {
    return (
      <div className="page-container">
        <p className="empty-state">Loading setlist...</p>
      </div>
    );
  }

  if (setlistDetailPage.error || !setlistDetailPage.setlist) {
    return (
      <div className="page-container">
        <div className="card">
          <p className="alert alert-error">
            {setlistDetailPage.error || "Setlist not found"}
          </p>
          <Link
            href={`/bands/${setlistDetailPage.bandId}`}
            className="button button-tertiary"
          >
            Back to {setlistDetailPage.band?.name || "Band"}
          </Link>
        </div>
      </div>
    );
  }

  const setlist = setlistDetailPage.setlist;

  if (setlistDetailPage.editor.isEditing) {
    return (
      <div className="page-container">
        <SetlistEditMode
          bandId={setlistDetailPage.bandId!}
          collapseSongPickers
          editName={setlistDetailPage.editor.editName}
          setEditName={setlistDetailPage.editor.setEditName}
          editSongs={setlistDetailPage.editor.editSongs}
          isSaving={setlistDetailPage.editor.isSaving}
          onSave={() =>
            setlistDetailPage.editor.handleSave(setlistDetailPage.setlistId!)
          }
          onCancel={setlistDetailPage.editor.cancelEditing}
          onRemoveSong={setlistDetailPage.editor.handleRemoveEditSong}
          onMoveSong={setlistDetailPage.editor.handleMoveSong}
          onAddFromSearch={setlistDetailPage.editor.handleAddFromSearch}
          onToggleCustomSong={setlistDetailPage.editor.handleToggleCustomSong}
          onToggleCustomAlbum={setlistDetailPage.editor.handleToggleCustomAlbum}
          onToggleCoverSong={setlistDetailPage.editor.handleToggleCoverSong}
          onToggleProfileSong={setlistDetailPage.editor.handleToggleProfileSong}
          isEditSongSelected={setlistDetailPage.editor.isEditSongSelected}
          saveLabel="Save Changes"
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <SetlistViewMode
        bandId={setlistDetailPage.bandId!}
        songsPrivate={setlistDetailPage.band?.customSongsPrivate === true}
        setlist={setlistDetailPage.setlist}
        isDeleting={setlistDetailPage.isDeleting}
        learntMap={setlistDetailPage.learntMap}
        learningIds={setlistDetailPage.learningIds}
        togglingIds={setlistDetailPage.togglingIds}
        userEmail={session.user?.email}
        totalDuration={setlistDetailPage.totalDuration}
        progress={setlistDetailPage.progress}
        onStartEdit={() =>
          setlistDetailPage.editor.startEditing(setlist.name, setlist.songs)
        }
        onToggleActive={setlistDetailPage.handleToggleActive}
        onDelete={setlistDetailPage.handleDelete}
        onToggleLearnt={setlistDetailPage.handleToggleLearnt}
        onToggleLearning={setlistDetailPage.handleToggleLearning}
      />
    </div>
  );
}
