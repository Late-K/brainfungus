"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="nav-item">
          <img src="/home.svg" alt="Home" width={22} height={22} />
          <span>Home</span>
        </Link>

        <Link href={session ? "/profile" : "/login"} className="nav-item">
          <img src="/user.svg" alt="Profile" width={22} height={22} />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
