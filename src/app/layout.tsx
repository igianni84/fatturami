import type { Metadata } from "next";
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
        {children}
      </body>
    </html>
  );
}
