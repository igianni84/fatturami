import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "fatturami.cloud — Fatturazione per Freelancer",
  description:
    "Fatture, preventivi, report fiscali. Tutto in un unico posto. Gratis per iniziare.",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          dmSans.variable,
          playfair.variable
        )}
      >
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
