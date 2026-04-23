// band chat page

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import BandChatComponent from "@/app/components/bandChatComponent";
import { Band } from "@/app/types";

export default function BandChatPage({
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
        console.error("Failed to fetch band:", err);
      }
    }
    fetchBand();
  }, [bandId]);

  if (!session) redirect("/login");

  if (!bandId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page-chat">
      <Link href={`/bands/${bandId}`} className="back-link">
        ← Back to {band?.name || "Band"}
      </Link>

      <BandChatComponent bandId={bandId} fullPage />
    </div>
  );
}
