"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

// bottom tab bar on mobile, top bar on desktop (see .navbar in globals.css)
const navItems = [
  { href: "/calendar", icon: "/calendar.svg", label: "Calendar" },
  { href: "/", icon: "/home.svg", label: "Home" },
  { href: "/profile", icon: "/user.svg", label: "Profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/bands");
  return pathname.startsWith(href);
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (pathname === "/login" || status === "loading" || !session) return null;

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <Image
          src="/brain-fungus-spanned.png"
          alt="Brain Fungus"
          width={420}
          height={84}
          className="navbar-brand-image"
        />
      </Link>

      <div className="navbar-inner">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${active ? " nav-item-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <img src={item.icon} alt="" width={22} height={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
