"use client";

import { useState } from "react";
import { inviteMemberAction } from "@/app/actions/invites";
import { ProfileInviteBand } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

const statusLabels: Record<ProfileInviteBand["status"], string> = {
  member: " (already a member)",
  invited: " (invited)",
  none: "",
};

// lets a band admin invite the user whose profile they're viewing
export default function InviteToBand({
  userId,
  firstName,
  bands,
}: {
  userId: string;
  firstName: string;
  bands: ProfileInviteBand[];
}) {
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [selectedBandId, setSelectedBandId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (bands.length === 0) return null;

  const statusOf = (band: ProfileInviteBand) =>
    invitedIds.has(band._id) ? "invited" : band.status;

  const handleInvite = async () => {
    const band = bands.find((b) => b._id === selectedBandId);
    if (!band) return;

    setError("");
    setSuccess("");
    setIsInviting(true);
    try {
      unwrapAction(await inviteMemberAction(band._id, userId));
      setInvitedIds((prev) => new Set(prev).add(band._id));
      setSelectedBandId("");
      setSuccess(`Invited ${firstName} to ${band.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="list-top">
      <label className="label" htmlFor="invite-to-band">
        Invite to Band
      </label>
      <div className="input-row">
        <select
          id="invite-to-band"
          className="input"
          value={selectedBandId}
          onChange={(e) => setSelectedBandId(e.target.value)}
          disabled={isInviting}
        >
          <option value="">Select a band</option>
          {bands.map((band) => (
            <option
              key={band._id}
              value={band._id}
              disabled={statusOf(band) !== "none"}
            >
              {band.name}
              {statusLabels[statusOf(band)]}
            </option>
          ))}
        </select>
        <button
          className="button button-primary"
          onClick={handleInvite}
          disabled={!selectedBandId || isInviting}
        >
          {isInviting ? "Inviting..." : "Invite"}
        </button>
      </div>
      {error && (
        <p className="alert alert-error alert-sm margin-top">{error}</p>
      )}
      {success && (
        <p className="alert alert-success alert-sm margin-top">{success}</p>
      )}
    </div>
  );
}
