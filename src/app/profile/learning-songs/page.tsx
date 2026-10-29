// profile/learning-songs page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/server/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/app/components/ui/pageHeader";
import AllProfileSongs from "@/app/components/profile/allProfileSongs";

export default async function ProfileLearningSongsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Currently Learning"
        description="Songs you are still learning. Mark them as learnt once you know them, and they will move to your learnt songs."
        backHref="/profile"
        backLabel="Back to Profile"
      />

      <AllProfileSongs list="learning" />
    </div>
  );
}
