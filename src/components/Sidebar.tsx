"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(main)/logout/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

function getNavItems(country?: string): NavItem[] {
  return [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Fatture", href: "/fatture" },
    { label: "Preventivi", href: "/preventivi" },
    { label: "Note Credito", href: "/note-credito" },
    { label: "Acquisti", href: "/acquisti" },
    { label: "Spese", href: "/spese" },
    {
      label: "Anagrafiche",
      href: "/anagrafiche",
      children: [
        { label: "Clienti", href: "/anagrafiche/clienti" },
        { label: "Fornitori", href: "/anagrafiche/fornitori" },
      ],
    },
    {
      label: "Importazioni",
      href: "/import",
      children: [
        { label: "CSV", href: "/import/csv" },
        { label: "PDF", href: "/import/pdf" },
        { label: "Fatture in Cloud", href: "/import/fattureincloud" },
      ],
    },
    {
      label: "Fiscale",
      href: "/fiscale",
      children: [
        { label: "IVA", href: "/fiscale/iva" },
        { label: country === "IT" ? "IRPEF" : "IRPF", href: "/fiscale/irpf" },
      ],
    },
    { label: "Impostazioni", href: "/impostazioni" },
    { label: "Abbonamento", href: "/abbonamento" },
  ];
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  if (item.children) {
    const isParentActive = pathname.startsWith(item.href);
    const groupId = `nav-group${item.href.replace(/\//g, "-")}`;
    return (
      <div role="group" aria-labelledby={groupId}>
        <span
          id={groupId}
          className={cn(
            "block px-4 py-2 text-sm font-semibold uppercase tracking-wider",
            isParentActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
          )}
        >
          {item.label}
        </span>
        <div className="ml-2">
          {item.children.map((child) => (
            <NavLink key={child.href} item={child} pathname={pathname} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      asChild
      className={cn(
        "w-full justify-start text-sm font-medium",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Link href={item.href} aria-current={isActive ? "page" : undefined}>{item.label}</Link>
    </Button>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  companyCountry?: string;
}

export default function Sidebar({ isOpen, onClose, companyCountry }: SidebarProps) {
  const pathname = usePathname();

  const stableOnClose = useCallback(() => onClose(), [onClose]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    stableOnClose();
  }, [pathname, stableOnClose]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 ease-in-out md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Logo iconClassName="h-6" textClassName="text-sidebar-foreground" />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
            onClick={onClose}
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Separator className="bg-sidebar-border" />
        <nav aria-label="Menu principale" className="flex-1 space-y-1 overflow-y-auto p-4">
          {getNavItems(companyCountry).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <Separator className="bg-sidebar-border" />
        <div className="p-4">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              Esci
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
