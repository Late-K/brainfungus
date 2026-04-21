// selected setlist page

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import SetlistEditMode from "@/app/components/setlistEditMode";
import SetlistViewMode from "@/app/components/setlistViewMode";
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
          <p className="alert alert--error">
            {setlistDetailPage.error || "Setlist not found"}
          </p>
          <Link
            href={`/bands/${setlistDetailPage.bandId}`}
            className="back-link"
          >
            ← Back to {setlistDetailPage.band?.name || "Band"}
          </Link>
        </div>
      </div>
    );
  }

  const setlist = setlistDetailPage.setlist;

  // ===================== EDIT MODE =====================
  if (setlistDetailPage.editor.isEditing) {
    return (
      <div className="page-container">
        <SetlistEditMode
          bandId={setlistDetailPage.bandId!}
          editName={setlistDetailPage.editor.editName}
          setEditName={setlistDetailPage.editor.setEditName}
          editSongs={setlistDetailPage.editor.editSongs}
          isSaving={setlistDetailPage.editor.isSaving}
          searchQuery={setlistDetailPage.editor.searchQuery}
          setSearchQuery={setlistDetailPage.editor.setSearchQuery}
          searchResults={setlistDetailPage.editor.searchResults}
          isSearching={setlistDetailPage.editor.isSearching}
          searchError={setlistDetailPage.editor.searchError}
          onSave={() =>
            setlistDetailPage.editor.handleSave(setlistDetailPage.setlistId!)
          }
          onCancel={setlistDetailPage.editor.cancelEditing}
          onRemoveSong={setlistDetailPage.editor.handleRemoveEditSong}
          onMoveSong={setlistDetailPage.editor.handleMoveSong}
          onSearch={setlistDetailPage.editor.handleSearch}
          onAddFromSearch={setlistDetailPage.editor.handleAddFromSearch}
          onToggleCustomSong={setlistDetailPage.editor.handleToggleCustomSong}
          onToggleCustomAlbum={setlistDetailPage.editor.handleToggleCustomAlbum}
          isEditSongSelected={setlistDetailPage.editor.isEditSongSelected}
          saveLabel="Save Changes"
        />
      </div>
    );
  }

  // ===================== VIEW MODE =====================
  return (
    <div className="page-container">
      <SetlistViewMode
        bandId={setlistDetailPage.bandId!}
        setlist={setlistDetailPage.setlist}
        isDeleting={setlistDetailPage.isDeleting}
        learntMap={setlistDetailPage.learntMap}
        togglingIds={setlistDetailPage.togglingIds}
        userName={session.user?.name}
        totalDuration={setlistDetailPage.totalDuration}
        progress={setlistDetailPage.progress}
        onStartEdit={() =>
          setlistDetailPage.editor.startEditing(setlist.name, setlist.songs)
        }
        onToggleActive={setlistDetailPage.handleToggleActive}
        onDelete={setlistDetailPage.handleDelete}
        onToggleLearnt={setlistDetailPage.handleToggleLearnt}
      />
    </div>
  );
}
