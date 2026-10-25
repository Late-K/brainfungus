// band creation page

"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import BandForm from "@/app/components/createBandForm";

export default function CreateBandPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <div className="page-shell">
      <section className="card page-container">
        <h1 className="heading">Create a Band</h1>

        <BandForm
          submitLabel="Create Band"
          onSuccess={() => {
            router.push("/");
          }}
          onCancel={() => {
            router.back();
          }}
        />
      </section>
    </div>
  );
}
