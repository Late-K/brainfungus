"use client";

import { Band } from "@/app/types";
import { useBandManagement } from "@/app/hooks/useBandManagement";
import BandDetailsTab from "@/app/components/bandManagementDetailsTab";
import BandMembersTab from "@/app/components/bandManagementMembersTab";

interface BandManagementProps {
  band: Band;
  currentUserEmail: string;
  onBandUpdated: () => void;
  onBandLeft: () => void;
}

export default function BandManagement({
  band,
  currentUserEmail,
  onBandUpdated,
  onBandLeft,
}: BandManagementProps) {
  const {
    isOpen,
    setIsOpen,
    tab,
    name,
    setName,
    description,
    setDescription,
    isSaving,
    availableUsers,
    isFetchingUsers,
    actionLoading,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    showLeaveConfirm,
    setShowLeaveConfirm,
    isLeaving,
    error,
    success,
    isAdmin,
    isCreator,
    handleOpen,
    handleTabChange,
    handleSaveDetails,
    handleDelete,
    handleLeaveBand,
    handleAddMember,
    handleRemoveMember,
    handleToggleAdmin,
    handleTransferCreator,
  } = useBandManagement({ band, currentUserEmail, onBandUpdated, onBandLeft });

  return (
    <>
      <button
        className="button button-tertiary button-small floating-gear-button"
        onClick={handleOpen}
        type="button"
      >
        ⚙
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-header">
              <h3>Manage Band</h3>
              <button
                className="button button-tertiary button-small"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {isAdmin && (
              <div className="tab-group">
                <button
                  className={`tab ${tab === "details" ? "tab-active" : ""}`}
                  onClick={() => handleTabChange("details")}
                >
                  Details
                </button>
                <button
                  className={`tab ${tab === "members" ? "tab-active" : ""}`}
                  onClick={() => handleTabChange("members")}
                >
                  Members
                </button>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {!isAdmin && (
              <BandMembersTab
                band={band}
                isAdmin={false}
                isCreator={false}
                availableUsers={[]}
                isFetchingUsers={false}
                actionLoading={null}
                showLeaveConfirm={showLeaveConfirm}
                isLeaving={isLeaving}
                onAddMember={() => {}}
                onRemoveMember={() => {}}
                onToggleAdmin={() => {}}
                onTransferCreator={() => {}}
                onShowLeaveConfirm={setShowLeaveConfirm}
                onLeave={handleLeaveBand}
              />
            )}

            {isAdmin && tab === "details" && (
              <BandDetailsTab
                band={band}
                name={name}
                description={description}
                isSaving={isSaving}
                isCreator={isCreator}
                showDeleteConfirm={showDeleteConfirm}
                showLeaveConfirm={showLeaveConfirm}
                isDeleting={isDeleting}
                isLeaving={isLeaving}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onSave={handleSaveDetails}
                onDelete={handleDelete}
                onLeave={handleLeaveBand}
                onShowDeleteConfirm={setShowDeleteConfirm}
                onShowLeaveConfirm={setShowLeaveConfirm}
              />
            )}

            {isAdmin && tab === "members" && (
              <BandMembersTab
                band={band}
                isAdmin={true}
                isCreator={isCreator}
                availableUsers={availableUsers}
                isFetchingUsers={isFetchingUsers}
                actionLoading={actionLoading}
                showLeaveConfirm={false}
                isLeaving={false}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onToggleAdmin={handleToggleAdmin}
                onTransferCreator={handleTransferCreator}
                onShowLeaveConfirm={() => {}}
                onLeave={() => {}}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
