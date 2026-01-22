"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/" },
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
    ],
  },
  { label: "Fiscale", href: "/fiscale" },
  { label: "Impostazioni", href: "/impostazioni" },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href);

  if (item.children) {
    const isParentActive = pathname.startsWith(item.href);
    return (
      <div>
        <span
          className={`block px-4 py-2 text-sm font-semibold uppercase tracking-wider ${
            isParentActive ? "text-blue-400" : "text-gray-400"
          }`}
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
    <Link
      href={item.href}
      className={`block rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-300 hover:bg-gray-700 hover:text-white"
      }`}
    >
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-gray-800">
      <div className="flex h-16 items-center justify-center border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">Fatturazione</h1>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
