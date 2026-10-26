// another user's profile page

import { getServerSession } from "next-auth/next";
import { authOptions, getAuthUser } from "@/app/lib/server/auth";
import { redirect } from "next/navigation";
import UserProfile from "@/app/components/profile/userProfile";

export default async function UserProfilePage({
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

  // viewing yourself goes to your own editable profile
  if (user._id.toString() === id) {
    redirect("/profile");
  }

  return (
    <div className="page-container">
      <UserProfile userId={id} />
    </div>
  );
}
