"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  deleteBandAction,
  updateBandAction,
  addMemberAction,
  removeMemberAction,
  toggleAdminAction,
  transferCreatorAction,
  leaveBandAction,
} from "@/app/actions/bands";
import { Band, BandMember, User } from "@/app/types";

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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"details" | "members">("details");

  const [name, setName] = useState(band.name);
  const [description, setDescription] = useState(band.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentMember = band.members?.find((m) => m.email === currentUserEmail);
  const isAdmin = currentMember?.isAdmin ?? false;
  const isCreator = currentMember?.isCreator ?? false;

  useEffect(() => {
    setName(band.name);
    setDescription(band.description || "");
  }, [band]);

  const fetchAvailableUsers = async () => {
    try {
      setIsFetchingUsers(true);
      const res = await fetch("/api/users/all");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      // filter out users already in the band
      const memberIds = band.members?.map((m) => m.id) ?? [];
      setAvailableUsers(
        (data.users ?? []).filter((u: User) => !memberIds.includes(u._id)),
      );
    } catch {
      setError("Failed to load users");
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError("");
    setSuccess("");
    setShowLeaveConfirm(false);
    if (isAdmin && tab === "members") fetchAvailableUsers();
  };

  const handleLeaveBand = async () => {
    setError("");
    setIsLeaving(true);
    try {
      await leaveBandAction(band._id);
      setIsOpen(false);
      onBandLeft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave band");
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleTabChange = (newTab: "details" | "members") => {
    setTab(newTab);
    setError("");
    setSuccess("");
    if (newTab === "members") fetchAvailableUsers();
  };

  const handleSaveDetails = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      await updateBandAction(band._id, name, description);
      setSuccess("Band details updated");
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update band");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setError("");
    setIsDeleting(true);
    try {
      await deleteBandAction(band._id);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete band");
      setIsDeleting(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(userId);
    try {
      await addMemberAction(band._id, userId);
      setSuccess("Member added");
      onBandUpdated();
      // remove from available list
      setAvailableUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(memberId);
    try {
      await removeMemberAction(band._id, memberId);
      setSuccess("Member removed");
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (memberId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(memberId);
    try {
      const result = await toggleAdminAction(band._id, memberId);
      setSuccess(result.message);
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferCreator = async (memberId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(memberId);
    try {
      await transferCreatorAction(band._id, memberId);
      setSuccess("Creator role transferred");
      onBandUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to transfer creator role",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <button className="btn btn--tertiary btn-small" onClick={handleOpen}>
        ⚙ Manage Band
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-header">
              <h3>Manage Band</h3>
              <button
                className="btn btn--tertiary btn-small"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {isAdmin && (
              <div className="mgmt-tabs">
                <button
                  className={`mgmt-tab ${tab === "details" ? "mgmt-tab--active" : ""}`}
                  onClick={() => handleTabChange("details")}
                >
                  Details
                </button>
                <button
                  className={`mgmt-tab ${tab === "members" ? "mgmt-tab--active" : ""}`}
                  onClick={() => handleTabChange("members")}
                >
                  Members
                </button>
              </div>
            )}

            {error && <div className="alert alert--error">{error}</div>}
            {success && <div className="alert alert--success">{success}</div>}

            {!isAdmin && (
              <div className="mgmt-section">
                <h4 className="mgmt-subtitle">Members</h4>
                <div className="mgmt-member-list">
                  {band.members?.map((member) => (
                    <div key={member.id} className="mgmt-member">
                      <div className="mgmt-member-info">
                        <div className="mgmt-member-avatar">
                          {member.image ? (
                            <Image
                              src={member.image}
                              alt={member.name}
                              width={36}
                              height={36}
                              className="mgmt-avatar-img"
                            />
                          ) : (
                            <div className="mgmt-avatar-fallback">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="mgmt-member-name">
                            {member.name}
                          </span>
                          <div className="mgmt-member-badges">
                            {member.isCreator && (
                              <span className="badge">Creator</span>
                            )}
                            {member.isAdmin && !member.isCreator && (
                              <span className="badge badge--active">Admin</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mgmt-danger-zone">
                  {!showLeaveConfirm ? (
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowLeaveConfirm(true)}
                    >
                      Leave Band
                    </button>
                  ) : (
                    <div className="mgmt-confirm">
                      <p>Are you sure you want to leave this band?</p>
                      <div className="form-actions">
                        <button
                          className="btn btn--secondary"
                          onClick={() => setShowLeaveConfirm(false)}
                          disabled={isLeaving}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={handleLeaveBand}
                          disabled={isLeaving}
                        >
                          {isLeaving ? "Leaving..." : "Yes, Leave"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAdmin && tab === "details" && (
              <div className="mgmt-section">
                <div className="form-group">
                  <label className="label" htmlFor="edit-band-name">
                    Band Name
                  </label>
                  <input
                    id="edit-band-name"
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="edit-band-desc">
                    Description
                  </label>
                  <textarea
                    id="edit-band-desc"
                    className="input textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={isSaving}
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="btn btn--primary"
                    onClick={handleSaveDetails}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="mgmt-danger-zone">
                  <h4>Danger Zone</h4>

                  {isCreator && (
                    <>
                      {!showDeleteConfirm ? (
                        <button
                          className="btn btn-danger"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          Delete Band
                        </button>
                      ) : (
                        <div className="mgmt-confirm">
                          <p>
                            Are you sure? This will permanently delete the band,
                            all setlists, and messages.
                          </p>
                          <div className="form-actions">
                            <button
                              className="btn btn--secondary"
                              onClick={() => setShowDeleteConfirm(false)}
                              disabled={isDeleting}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={handleDelete}
                              disabled={isDeleting}
                            >
                              {isDeleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {!showLeaveConfirm ? (
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowLeaveConfirm(true)}
                    >
                      Leave Band
                    </button>
                  ) : (
                    <div className="mgmt-confirm">
                      <p>Are you sure you want to leave this band?</p>
                      <div className="form-actions">
                        <button
                          className="btn btn--secondary"
                          onClick={() => setShowLeaveConfirm(false)}
                          disabled={isLeaving}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={handleLeaveBand}
                          disabled={isLeaving}
                        >
                          {isLeaving ? "Leaving..." : "Yes, Leave"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAdmin && tab === "members" && (
              <div className="mgmt-section">
                <h4 className="mgmt-subtitle">Current Members</h4>
                <div className="mgmt-member-list">
                  {band.members?.map((member) => (
                    <div key={member.id} className="mgmt-member">
                      <div className="mgmt-member-info">
                        <div className="mgmt-member-avatar">
                          {member.image ? (
                            <Image
                              src={member.image}
                              alt={member.name}
                              width={36}
                              height={36}
                              className="mgmt-avatar-img"
                            />
                          ) : (
                            <div className="mgmt-avatar-fallback">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="mgmt-member-name">
                            {member.name}
                          </span>
                          <div className="mgmt-member-badges">
                            {member.isCreator && (
                              <span className="badge">Creator</span>
                            )}
                            {member.isAdmin && !member.isCreator && (
                              <span className="badge badge--active">Admin</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!member.isCreator && (
                        <div className="mgmt-member-actions">
                          {isCreator && (
                            <button
                              className="btn btn--tertiary btn-small"
                              onClick={() => handleTransferCreator(member.id)}
                              disabled={actionLoading === member.id}
                              title="Make this member the band creator"
                            >
                              Make Creator
                            </button>
                          )}
                          <button
                            className="btn btn--tertiary btn-small"
                            onClick={() => handleToggleAdmin(member.id)}
                            disabled={actionLoading === member.id}
                            title={
                              member.isAdmin ? "Remove admin" : "Make admin"
                            }
                          >
                            {member.isAdmin ? "Remove Admin" : "Make Admin"}
                          </button>
                          <button
                            className="btn btn--tertiary-danger btn--tertiary btn-small"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={actionLoading === member.id}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <h4 className="mgmt-subtitle" style={{ marginTop: "1.5rem" }}>
                  Add Members
                </h4>
                {isFetchingUsers ? (
                  <p className="empty-state">Loading users...</p>
                ) : availableUsers.length > 0 ? (
                  <div className="mgmt-member-list">
                    {availableUsers.map((user) => (
                      <div key={user._id} className="mgmt-member">
                        <div className="mgmt-member-info">
                          <div className="mgmt-member-avatar">
                            {user.image ? (
                              <Image
                                src={user.image}
                                alt={user.name}
                                width={36}
                                height={36}
                                className="mgmt-avatar-img"
                              />
                            ) : (
                              <div className="mgmt-avatar-fallback">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="mgmt-member-name">{user.name}</span>
                        </div>
                        <button
                          className="btn btn--primary btn-small"
                          onClick={() => handleAddMember(user._id)}
                          disabled={actionLoading === user._id}
                        >
                          {actionLoading === user._id ? "Adding..." : "Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No more users to add</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
