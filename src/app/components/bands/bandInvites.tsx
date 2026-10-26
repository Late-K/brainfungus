"use client";

// band invites the current user hasn't answered yet, shown above their bands

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction, declineInviteAction } from "@/app/actions/invites";
import { PendingInvite } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";
import { useFetchData } from "@/app/hooks/useFetchData";
import { pluralise } from "@/app/lib/utils";

export default function BandInvites() {
  const router = useRouter();
  // invites that failing to load just aren't shown - the home page still works
  const { data } = useFetchData<{ invites: PendingInvite[] }>("/api/invites");
  // answered invites, hidden without reloading the list
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const invites = (data?.invites ?? []).filter((i) => !answeredIds.has(i._id));
  const hideInvite = (inviteId: string) =>
    setAnsweredIds((prev) => new Set(prev).add(inviteId));

  const handleAccept = async (invite: PendingInvite) => {
    setError("");
    setActionLoading(invite._id);
    try {
      const { bandId } = unwrapAction(await acceptInviteAction(invite._id));
      if (bandId) {
        router.push(`/bands/${bandId}`);
        return;
      }
      // cancelled, or the band was deleted, since the page loaded
      hideInvite(invite._id);
      setError(`The invite to ${invite.bandName} is no longer available`);
    } catch (err) {
      // the invite is kept so it can be tried again, e.g. after a dropped connection
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    }
    setActionLoading(null);
  };

  const handleDecline = async (invite: PendingInvite) => {
    setError("");
    setActionLoading(invite._id);
    try {
      unwrapAction(await declineInviteAction(invite._id));
      hideInvite(invite._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invite");
    } finally {
      setActionLoading(null);
    }
  };

  if (invites.length === 0 && !error) return null;

  return (
    <div className="full-width band-invites">
      {error && <div className="alert alert-error">{error}</div>}
      {invites.map((invite) => (
        <div key={invite._id} className="card band-invite-card">
          <div className="listing-row">
            {invite.bandImage && (
              <img src={invite.bandImage} alt="" className="band-thumbnail" />
            )}
            <div className="listing-main">
              <p className="band-invite-from">
                {invite.invitedByName} invited you to join
              </p>
              <h3 className="listing-title">{invite.bandName}</h3>
              {invite.bandDescription && (
                <p className="listing-description">{invite.bandDescription}</p>
              )}
            </div>
            <div className="listing-aside">
              {pluralise(invite.memberCount, "member")}
            </div>
          </div>
          <div className="form-actions band-invite-actions">
            <button
              className="button button-secondary button-small"
              onClick={() => handleDecline(invite)}
              disabled={actionLoading === invite._id}
            >
              Decline
            </button>
            <button
              className="button button-primary button-small"
              onClick={() => handleAccept(invite)}
              disabled={actionLoading === invite._id}
            >
              {actionLoading === invite._id ? "Joining..." : "Accept"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
