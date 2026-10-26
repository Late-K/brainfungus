// browser side install helpers - working out if brain fungus is already installed,
// and holding onto chrome's install prompt until the user asks for it

import { useSyncExternalStore } from "react";

// chrome/edge/android only, so it isn't in typescript's dom types
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// true when opened from the home screen / app icon rather than a browser tab
export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ipads report themselves as macs, but macs don't have touch screens
export function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

// the browser only fires beforeinstallprompt when the app can be installed and isn't yet,
// and it can fire before the install button is on screen, so it's caught here as soon as this loads
let state: { prompt: BeforeInstallPromptEvent | null; installed: boolean } = {
  prompt: null,
  installed: false,
};
const listeners = new Set<() => void>();

function setState(next: typeof state) {
  state = next;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // stops chrome's own install banner, the install button shows the prompt instead
    event.preventDefault();
    setState({ ...state, prompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => {
    setState({ prompt: null, installed: true });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState = { prompt: null, installed: false };

function getMode() {
  if (isStandalone()) return "standalone";
  return isIos() ? "ios" : "browser";
}

export function useInstallPrompt() {
  const { prompt, installed } = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
  // null on the server, since it can't know how the page was opened
  const mode = useSyncExternalStore(subscribe, getMode, () => null);

  // the event can only be used once, so it's dropped whatever the user picks
  const promptInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setState({ prompt: null, installed: outcome === "accepted" });
  };

  return { mode, canPrompt: !!prompt, installed, promptInstall };
}
