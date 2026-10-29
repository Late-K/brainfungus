// selected setlist page

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  const editor = setlistDetailPage.editor;

  return (
    <div className="page-container">
      <SetlistViewMode
        bandId={setlistDetailPage.bandId!}
        songsPrivate={setlistDetailPage.band?.customSongsPrivate === true}
        setlist={setlistDetailPage.setlist}
        isDeleting={setlistDetailPage.isDeleting}
        isSaving={setlistDetailPage.isSaving}
        learntMap={setlistDetailPage.learntMap}
        learningIds={setlistDetailPage.learningIds}
        togglingIds={setlistDetailPage.togglingIds}
        userEmail={session.user?.email}
        totalDuration={setlistDetailPage.totalDuration}
        progress={setlistDetailPage.progress}
        onRename={setlistDetailPage.handleRename}
        onToggleActive={setlistDetailPage.handleToggleActive}
        onDelete={setlistDetailPage.handleDelete}
        onToggleLearnt={setlistDetailPage.handleToggleLearnt}
        onToggleLearning={setlistDetailPage.handleToggleLearning}
        onMoveSong={editor.handleMoveSong}
        onRemoveSong={editor.handleRemoveSong}
        onAddFromSearch={editor.handleAddFromSearch}
        onToggleCustomSong={editor.handleToggleCustomSong}
        onToggleCustomAlbum={editor.handleToggleCustomAlbum}
        onToggleCoverSong={editor.handleToggleCoverSong}
        onToggleProfileSong={editor.handleToggleProfileSong}
        isSongSelected={editor.isSongSelected}
      />
    </div>
  );
}
