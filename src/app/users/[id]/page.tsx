// another user's profile page

import { getServerSession } from "next-auth/next";
import { authOptions, getAuthUser } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import UserProfileComponent from "@/app/components/userProfileComponent";

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
      <UserProfileComponent userId={id} />
    </div>
  );
}
