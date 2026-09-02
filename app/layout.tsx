import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export const metadata: Metadata = {
  title: "RevisionOS",
  description: "Révision, bibliothèque PDF, QCM, agenda et gestion documentaire",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <Sidebar />
        <div className="ml-72 min-h-screen bg-zinc-50">
          <Topbar />
          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
