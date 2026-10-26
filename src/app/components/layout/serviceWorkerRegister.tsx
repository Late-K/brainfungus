"use client";

// registers /sw.js - production only, since dev chunks aren't hashed and caching them breaks hot reload

import { useEffect } from "react";
// loaded on every page so chrome's install prompt is caught even before the profile page is opened
import "@/app/lib/installClient";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
