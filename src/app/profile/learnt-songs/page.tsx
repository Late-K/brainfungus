// profile/learnt-songs page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/app/components/pageHeader";
import ProfileLearntSongsComponent from "@/app/components/profileLearntSongsComponent";

export default async function ProfileLearntSongsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="page-container">
      <PageHeader
        title="My Learnt Songs"
        description="Songs you have marked as learnt across all your bands, plus any you add personally."
        backHref="/profile"
        backLabel="Back to Profile"
      />

      <ProfileLearntSongsComponent />
    </div>
  );
}
