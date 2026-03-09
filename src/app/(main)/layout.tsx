"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { PageBreadcrumb } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <CommandPalette />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b bg-background px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Apri menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-3 text-lg font-bold">Fatturazione</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/40 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <PageBreadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
