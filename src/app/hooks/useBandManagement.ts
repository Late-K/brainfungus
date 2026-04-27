"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteBandAction,
  updateBandAction,
  addMemberAction,
  removeMemberAction,
  toggleAdminAction,
  transferCreatorAction,
  leaveBandAction,
} from "@/app/actions/bands";
import { Band, User } from "@/app/types";

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
    handleDelete,
    handleLeaveBand,
    handleAddMember,
    handleRemoveMember,
    handleToggleAdmin,
    handleTransferCreator,
  };
}
