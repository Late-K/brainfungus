"use client";

// loads the user's preferred music app once and shares it with every song list

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getMusicAppAction, setMusicAppAction } from "@/app/actions/users";
import { MusicApp } from "@/app/types";
import { unwrapAction } from "@/app/lib/actionResult";

interface MusicAppContextValue {
  musicApp: MusicApp | null;
  isLoading: boolean;
  setMusicApp: (musicApp: MusicApp | null) => Promise<void>;
}

const MusicAppContext = createContext<MusicAppContextValue>({
  musicApp: null,
  isLoading: true,
  setMusicApp: async () => {},
});

export function MusicAppProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  // undefined until the preference has been fetched
  const [savedApp, setSavedApp] = useState<MusicApp | null | undefined>();

  useEffect(() => {
    if (status !== "authenticated") return;

    getMusicAppAction()
      .then(unwrapAction)
      .then((data) => setSavedApp(data.musicApp))
      .catch((err) => {
        console.error("Failed to load music app:", err);
        setSavedApp(null);
      });
  }, [status]);

  const isAuthenticated = status === "authenticated";
  const musicApp = isAuthenticated ? (savedApp ?? null) : null;
  const isLoading =
    status === "loading" || (isAuthenticated && savedApp === undefined);

  const setMusicApp = async (newValue: MusicApp | null) => {
    const previous = musicApp;
    setSavedApp(newValue);
    try {
      unwrapAction(await setMusicAppAction(newValue));
    } catch {
      setSavedApp(previous);
    }
  };

  return (
    <MusicAppContext.Provider value={{ musicApp, isLoading, setMusicApp }}>
      {children}
    </MusicAppContext.Provider>
  );
}

export function useMusicApp() {
  return useContext(MusicAppContext);
}
