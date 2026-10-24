// root layout, wraps all pages, provides auth context and navbar

import type { Metadata, Viewport } from "next";
import { AuthProvider } from "./providers";
import Navbar from "./components/navbar";
import ServiceWorkerRegister from "./components/serviceWorkerRegister";

import "./globals.css";

export const metadata: Metadata = {
  title: "Brain Fungus",
  applicationName: "Brain Fungus",
  // ios ignores most of the manifest, so it needs these to install properly
  appleWebApp: {
    capable: true,
    title: "Brain Fungus",
    statusBarStyle: "black",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c090a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <main className="app-main">{children}</main>
          <Navbar />
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
