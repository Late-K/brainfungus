"use client";

import Image from "next/image";
import { Band, User } from "@/app/types";

interface BandMembersTabProps {
  band: Band;
  isAdmin: boolean;
  isCreator: boolean;
  availableUsers: User[];
  isFetchingUsers: boolean;
  actionLoading: string | null;
  showLeaveConfirm: boolean;
  isLeaving: boolean;
  onAddMember: (userId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onToggleAdmin: (memberId: string) => void;
  onTransferCreator: (memberId: string) => void;
  onShowLeaveConfirm: (show: boolean) => void;
  onLeave: () => void;
}

export default function BandMembersTab({
  band,
  isAdmin,
  isCreator,
  availableUsers,
  isFetchingUsers,
  actionLoading,
  showLeaveConfirm,
  isLeaving,
  onAddMember,
  onRemoveMember,
  onToggleAdmin,
  onTransferCreator,
  onShowLeaveConfirm,
  onLeave,
}: BandMembersTabProps) {
  return (
    <div className="section-block">
      <h4 className="section-subtitle">Members</h4>
      <div className="list-compact">
        {band.members?.map((member) => (
          <div key={member.id} className="member-row card-item">
            <div className="member-info">
              <div className="member-avatar">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={36}
                    height={36}
                    className="avatar-small"
                  />
                ) : (
                  <div className="avatar-small-fallback">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <span className="member-name">{member.name}</span>
                {member.isCreator ? (
                  <span className="member-role">Creator</span>
                ) : member.isAdmin ? (
                  <span className="member-role">Admin</span>
                ) : null}
              </div>
            </div>

            {isAdmin && !member.isCreator && (
              <div className="member-actions">
                {isCreator && (
                  <button
                    className="button button-tertiary button-small"
                    onClick={() => onTransferCreator(member.id)}
                    disabled={actionLoading === member.id}
                    title="Make this member the band creator"
                  >
                    Make Creator
                  </button>
                )}
                <button
                  className="button button-tertiary button-small"
                  onClick={() => onToggleAdmin(member.id)}
                  disabled={actionLoading === member.id}
                  title={member.isAdmin ? "Remove admin" : "Make admin"}
                >
                  {member.isAdmin ? "Remove Admin" : "Make Admin"}
                </button>
                <button
                  className="button button-tertiary-danger button-tertiary button-small"
                  onClick={() => onRemoveMember(member.id)}
                  disabled={actionLoading === member.id}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <h4 className="section-subtitle section-subtitle-top">Add Members</h4>
      )}
      {isAdmin &&
        (isFetchingUsers ? (
          <p className="empty-state">Loading users...</p>
        ) : availableUsers.length > 0 ? (
          <div className="list-compact">
            {availableUsers.map((user) => (
              <div key={user._id} className="member-row card-item">
                <div className="member-info">
                  <div className="member-avatar">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={36}
                        height={36}
                        className="avatar-small"
                      />
                    ) : (
                      <div className="avatar-small-fallback">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="member-name">{user.name}</span>
                </div>
                <button
                  className="button button-primary button-small"
                  onClick={() => onAddMember(user._id)}
                  disabled={actionLoading === user._id}
                >
                  {actionLoading === user._id ? "Adding..." : "Add"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No more users to add</p>
        ))}

      {!isAdmin && (
        <div className="band-options">
          {!showLeaveConfirm ? (
            <button
              className="button button-tertiary button-tertiary-danger"
              onClick={() => onShowLeaveConfirm(true)}
            >
              Leave Band
            </button>
          ) : (
            <div className="confirm-block">
              <p>Are you sure you want to leave this band?</p>
              <div className="form-actions">
                <button
                  className="button button-secondary"
                  onClick={() => onShowLeaveConfirm(false)}
                  disabled={isLeaving}
                >
                  Cancel
                </button>
                <button
                  className="button button-tertiary button-tertiary-danger"
                  onClick={onLeave}
                  disabled={isLeaving}
                >
                  {isLeaving ? "Leaving..." : "Yes, Leave"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
