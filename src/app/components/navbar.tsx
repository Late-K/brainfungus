"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import SignInButton from "./signInButton";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex items-center justify-between bg-gray-100 p-4">
      <div className="space-x-4">
        <Link href="/" className="font-medium hover:underline">
          Home
        </Link>
        <Link
          href={session ? "/profile" : "/login"}
          className="font-medium hover:underline"
        >
          Profile
        </Link>
      </div>
    </nav>
  );
}
