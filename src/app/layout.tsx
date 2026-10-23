// root layout, wraps all pages, provides auth context and navbar

import { AuthProvider } from "./providers";
import Navbar from "./components/navbar";

import "./globals.css";

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
      </body>
    </html>
  );
}
