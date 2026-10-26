"use client";

import { useState } from "react";
import AvatarImage from "@/app/components/ui/avatarImage";
import Link from "next/link";
import { Band, User } from "@/app/types";

const max_results = 5;

interface BandMembersTabProps {
  band: Band;
  isAdmin: boolean;
  isCreator: boolean;
  availableUsers: User[];
  isFetchingUsers: boolean;
  actionLoading: string | null;
  showLeaveConfirm: boolean;
  isLeaving: boolean;
  onInviteMember: (userId: string) => void;
  onCancelInvite: (userId: string) => void;
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
  onInviteMember,
  onCancelInvite,
  onRemoveMember,
  onToggleAdmin,
  onTransferCreator,
  onShowLeaveConfirm,
  onLeave,
}: BandMembersTabProps) {
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const matches = trimmedQuery
    ? availableUsers
        .filter((user) => user.name?.toLowerCase().includes(trimmedQuery))
        .slice(0, max_results)
    : [];

  return (
    <div className="section-block">
      <h4 className="section-subtitle">Members</h4>
      <div className="list-compact">
        {band.members?.map((member) => (
          <div key={member.id} className="member-row card-item">
            <div className="member-info">
              <div className="member-avatar">
                {member.image ? (
                  <AvatarImage
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
                <Link
                  href={`/users/${member.id}`}
                  className="member-name member-name-link"
                >
                  {member.name}
                </Link>
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
                  className="button button-small button-tertiary button-tertiary-danger"
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

      {(band.invites?.length ?? 0) > 0 && (
        <>
          <h4 className="section-subtitle section-subtitle-top">
            Pending Invites
          </h4>
          <div className="list-compact">
            {band.invites?.map((invitee) => (
              <div key={invitee.id} className="member-row card-item">
                <div className="member-info">
                  <div className="member-avatar">
                    {invitee.image ? (
                      <AvatarImage
                        src={invitee.image}
                        alt={invitee.name}
                        width={36}
                        height={36}
                        className="avatar-small"
                      />
                    ) : (
                      <div className="avatar-small-fallback">
                        {invitee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/users/${invitee.id}`}
                      className="member-name member-name-link"
                    >
                      {invitee.name}
                    </Link>
                    <span className="member-role">Invited</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="member-actions">
                    <button
                      className="button button-small button-tertiary button-tertiary-danger"
                      onClick={() => onCancelInvite(invitee.id)}
                      disabled={actionLoading === invitee.id}
                    >
                      {actionLoading === invitee.id
                        ? "Cancelling..."
                        : "Cancel Invite"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <h4 className="section-subtitle section-subtitle-top">
          Invite Members
        </h4>
      )}
      {isAdmin && (
        <>
          <input
            type="search"
            className="input"
            placeholder={
              isFetchingUsers ? "Loading users..." : "Search by name..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isFetchingUsers}
          />
          {trimmedQuery &&
            !isFetchingUsers &&
            (matches.length === 0 ? (
              <p className="empty-state">No users found.</p>
            ) : (
              <div className="list-compact list-top">
                {matches.map((user) => (
                  <div key={user._id} className="member-row card-item">
                    <div className="member-info">
                      <div className="member-avatar">
                        {user.image ? (
                          <AvatarImage
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
                      <Link
                        href={`/users/${user._id}`}
                        className="member-name member-name-link"
                      >
                        {user.name}
                      </Link>
                    </div>
                    <button
                      className="button button-primary button-small"
                      onClick={() => onInviteMember(user._id)}
                      disabled={actionLoading === user._id}
                    >
                      {actionLoading === user._id ? "Inviting..." : "Invite"}
                    </button>
                  </div>
                ))}
              </div>
            ))}
        </>
      )}

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
