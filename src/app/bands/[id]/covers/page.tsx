"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import BandCoversComponent from "@/app/components/bandCoversComponent";
import BandSubpageHeader from "@/app/components/bandSubpageHeader";

export default function BandCoversPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const { id: bandId } = use(params);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <div className="page-container">
      <BandSubpageHeader
        title="Covers"
        description="Browse and manage the songs your band covers, sourced from Deezer."
        bandId={bandId}
      />

      <BandCoversComponent bandId={bandId} userEmail={session.user?.email} />
    </div>
  );
}
