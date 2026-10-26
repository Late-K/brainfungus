"use client";

import { SessionProvider } from "next-auth/react";
import { MusicAppProvider } from "@/app/components/layout/musicAppProvider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MusicAppProvider>{children}</MusicAppProvider>
    </SessionProvider>
  );
}
