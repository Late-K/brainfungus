// band chat page

"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import BandChat from "@/app/components/chat/bandChat";

export default function BandChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const { id: bandId } = use(params);

  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <div className="page-chat">
      <BandChat
        bandId={bandId}
        fullPage
        backHref={`/bands/${bandId}`}
      />
    </div>
  );
}
