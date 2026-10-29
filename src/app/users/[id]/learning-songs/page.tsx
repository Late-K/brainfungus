// another user's learning songs page

import { getServerSession } from "next-auth/next";
import { authOptions, getAuthUser } from "@/app/lib/server/auth";
import { redirect } from "next/navigation";
import UserLearningSongs from "@/app/components/profile/userLearningSongs";

export default async function UserLearningSongsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const { user } = await getAuthUser();

  // your own learning songs live on your profile
  if (user._id.toString() === id) {
    redirect("/profile/learning-songs");
  }

  return (
    <div className="page-container">
      <UserLearningSongs userId={id} />
    </div>
  );
}
