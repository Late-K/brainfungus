"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteBandAction,
  updateBandAction,
  uploadBandImageAction,
  deleteBandImageAction,
  removeMemberAction,
  toggleAdminAction,
  transferCreatorAction,
  leaveBandAction,
} from "@/app/actions/bands";
import { cancelInviteAction, inviteMemberAction } from "@/app/actions/invites";
import { Band, User } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

interface UseBandManagementProps {
  band: Band;
  currentUserEmail: string;
  onBandUpdated: () => void;
  onBandLeft: () => void;
}

export function useBandManagement({
  band,
  currentUserEmail,
  onBandUpdated,
  onBandLeft,
}: UseBandManagementProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"details" | "members">("details");

  const [name, setName] = useState(band.name);
  const [description, setDescription] = useState(band.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [allUsers, setAllUsers] = useState<User[]>([]);
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

  // everyone who isn't already in the band or invited to it
  const availableUsers = useMemo(() => {
    const takenIds = new Set([
      ...(band.members ?? []).map((m) => m.id),
      ...(band.invites ?? []).map((i) => i.id),
    ]);
    return allUsers.filter((u) => !takenIds.has(u._id));
  }, [allUsers, band.members, band.invites]);

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
      setAllUsers(data.users ?? []);
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
      unwrapAction(await leaveBandAction(band._id));
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
      unwrapAction(await updateBandAction(band._id, name, description));
      setSuccess("Band details updated");
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update band");
    } finally {
      setIsSaving(false);
    }
  };

  // band image changes save straight away rather than with the details form
  const handleImageSelect = async (file: File) => {
    setError("");
    setSuccess("");
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      unwrapAction(await uploadBandImageAction(band._id, formData));
      setSuccess("Band image updated");
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageRemove = async () => {
    setError("");
    setSuccess("");
    setIsUploadingImage(true);
    try {
      unwrapAction(await deleteBandImageAction(band._id));
      setSuccess("Band image removed");
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    setError("");
    setIsDeleting(true);
    try {
      unwrapAction(await deleteBandAction(band._id));
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete band");
      setIsDeleting(false);
    }
  };

  const handleInviteMember = async (userId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(userId);
    try {
      unwrapAction(await inviteMemberAction(band._id, userId));
      setSuccess("Invite sent");
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvite = async (userId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(userId);
    try {
      unwrapAction(await cancelInviteAction(band._id, userId));
      setSuccess("Invite cancelled");
      onBandUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel invite");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(memberId);
    try {
      unwrapAction(await removeMemberAction(band._id, memberId));
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
      const result = unwrapAction(await toggleAdminAction(band._id, memberId));
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
      unwrapAction(await transferCreatorAction(band._id, memberId));
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

  return {
    // modal state
    isOpen,
    setIsOpen,
    tab,
    // form state
    name,
    setName,
    description,
    setDescription,
    isSaving,
    isUploadingImage,
    // users
    availableUsers,
    isFetchingUsers,
    actionLoading,
    // confirm dialogs
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    showLeaveConfirm,
    setShowLeaveConfirm,
    isLeaving,
    // feedback
    error,
    success,
    // derived
    isAdmin,
    isCreator,
    // handlers
    handleOpen,
    handleTabChange,
    handleSaveDetails,
    handleImageSelect,
    handleImageRemove,
    handleDelete,
    handleLeaveBand,
    handleInviteMember,
    handleCancelInvite,
    handleRemoveMember,
    handleToggleAdmin,
    handleTransferCreator,
  };
}
