import Image from "next/image";
import type { Session } from "next-auth";
import AlwaysAvailableToggle from "@/app/components/alwaysAvailableToggle";

export default function ProfileCard({ session }: { session: Session | null }) {
  return (
    <div className="card">
      <div className="media-row">
        {session?.user?.image ? (
          <Image
            src={session.user.image}
            alt="avatar"
            width={90}
            height={90}
            className="avatar-large"
          />
        ) : (
          <div className="avatar-large placeholder">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}

        <div>
          <h1 className="heading-small">
            {session?.user?.name || "Unknown user"}
          </h1>
          <p className="meta-text meta-text-medium margin-top">
            {session?.user?.email || "No email"}
          </p>
        </div>
      </div>
      <div>
        <AlwaysAvailableToggle />
      </div>
    </div>
  );
}
