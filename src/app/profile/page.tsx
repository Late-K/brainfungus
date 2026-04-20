// profile page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/components/signOutButton";
import AlwaysAvailableToggle from "@/app/components/alwaysAvailableToggle";
import ProfileCard from "@/app/components/profileCard";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <ProfileCard session={session} />

      <div className="card">
        <AlwaysAvailableToggle />
      </div>

      <div className="profile-actions">
        <SignOutButton />
      </div>
    </>
  );
}
