"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import BandCoversComponent from "@/app/components/bandCoversComponent";
import { Band } from "@/app/types";

export default function BandCoversPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const [bandId, setBandId] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);

  useEffect(() => {
    const unwrapParams = async () => {
      const { id } = await params;
      setBandId(id);
    };

    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!bandId) return;
    async function fetchBand() {
      try {
        const res = await fetch(`/api/bands/${bandId}`);
        if (res.ok) {
          const data = await res.json();
          setBand(data.band);
        }
      } catch (err) {
        setBand(null);
      }
    }

    fetchBand();
  }, [bandId]);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  if (!bandId) {
    return (
      <div className="page-container">
        <p className="empty-state">Loading covers...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Link href={`/bands/${bandId}`} className="back-link">
        ← Back to {band?.name || "Band"}
      </Link>

      <BandCoversComponent bandId={bandId} userName={session.user?.name} />
    </div>
  );
}
