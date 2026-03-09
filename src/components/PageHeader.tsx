"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Map of path segments to Italian labels
const segmentLabels: Record<string, string> = {
  fatture: "Fatture",
  preventivi: "Preventivi",
  "note-credito": "Note di Credito",
  acquisti: "Acquisti",
  spese: "Spese",
  anagrafiche: "Anagrafiche",
  clienti: "Clienti",
  fornitori: "Fornitori",
  import: "Importazioni",
  csv: "CSV",
  pdf: "PDF",
  fiscale: "Fiscale",
  iva: "IVA",
  irpf: "IRPF",
  impostazioni: "Impostazioni",
  nuova: "Nuova",
  nuovo: "Nuovo",
  modifica: "Modifica",
};

interface BreadcrumbEntry {
  label: string;
  href: string;
}

export function PageBreadcrumb() {
  const pathname = usePathname();

  // Don't show breadcrumb on dashboard
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbEntry[] = [];

  // Build breadcrumb items
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    // Skip dynamic segments (IDs like cuid) - they don't need their own crumb
    const isCuidId = /^c[a-z0-9]{24,}$/.test(segment);
    if (isCuidId) continue;

    const label = segmentLabels[segment] || segment;
    items.push({ label, href: currentPath });
  }

  if (items.length === 0) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => (
          <span key={item.href} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
