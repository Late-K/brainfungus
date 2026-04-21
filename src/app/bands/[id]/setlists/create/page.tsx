// setlist creation page

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import SetlistEditMode from "@/app/components/setlistEditMode";
import { useCreateSetlistPage } from "@/app/hooks/useCreateSetlistPage";

export default function CreateSetlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const createSetlistPage = useCreateSetlistPage(params);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <div className="page-container">
      <Link href={`/bands/${createSetlistPage.bandId}`} className="back-link">
        ← Back to Band
      </Link>

      {createSetlistPage.error && (
        <div className="card">
          <p className="alert alert--error">{createSetlistPage.error}</p>
        </div>
      )}

      <SetlistEditMode
        bandId={createSetlistPage.bandId || ""}
        editName={createSetlistPage.setlistName}
        setEditName={createSetlistPage.setSetlistName}
        editSongs={createSetlistPage.selectedSongs}
        isSaving={createSetlistPage.isSaving}
        searchQuery={createSetlistPage.searchQuery}
        setSearchQuery={createSetlistPage.setSearchQuery}
        searchResults={createSetlistPage.searchResults}
        isSearching={createSetlistPage.isSearching}
        searchError={createSetlistPage.searchError}
        onSave={createSetlistPage.handleCreateSetlist}
        onCancel={createSetlistPage.handleCancel}
        onRemoveSong={createSetlistPage.handleRemoveSelectedSong}
        onMoveSong={createSetlistPage.handleMoveSong}
        onSearch={createSetlistPage.handleSearch}
        onAddFromSearch={createSetlistPage.handleAddSong}
        onToggleCustomSong={createSetlistPage.handleToggleCustomSong}
        onToggleCustomAlbum={createSetlistPage.handleToggleCustomAlbum}
        isEditSongSelected={createSetlistPage.isSongSelected}
        title="Create New Setlist"
        saveLabel="Create Setlist"
        canSave={createSetlistPage.selectedSongs.length > 0}
      />
    </div>
  );
}
