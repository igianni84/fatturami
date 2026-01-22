import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema di Fatturazione",
  description: "Sistema di Fatturazione Internazionale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
