// profile page

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import SignOutButton from "@/app/components/signOutButton";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <div className="card">
        <div className="profile-header">
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt="avatar"
              width={90}
              height={90}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar placeholder">
              {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          <div className="profile-user">
            <h1>{session.user?.name || "Unknown user"}</h1>
            <p>{session.user?.email || "No email"}</p>
          </div>
        </div>

        <div className="profile-actions">
          <SignOutButton />
        </div>
      </div>
    </>
  );
}
