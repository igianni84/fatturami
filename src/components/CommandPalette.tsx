"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface NavCommand {
  label: string;
  href: string;
  group: string;
}

const commands: NavCommand[] = [
  // Documenti
  { label: "Dashboard", href: "/", group: "Navigazione" },
  { label: "Fatture", href: "/fatture", group: "Navigazione" },
  { label: "Preventivi", href: "/preventivi", group: "Navigazione" },
  { label: "Note Credito", href: "/note-credito", group: "Navigazione" },
  { label: "Acquisti", href: "/acquisti", group: "Navigazione" },
  { label: "Spese", href: "/spese", group: "Navigazione" },
  // Anagrafiche
  { label: "Clienti", href: "/anagrafiche/clienti", group: "Anagrafiche" },
  { label: "Fornitori", href: "/anagrafiche/fornitori", group: "Anagrafiche" },
  // Azioni rapide
  { label: "Nuova Fattura", href: "/fatture/nuova", group: "Azioni" },
  { label: "Nuovo Preventivo", href: "/preventivi/nuovo", group: "Azioni" },
  { label: "Nuovo Acquisto", href: "/acquisti/nuovo", group: "Azioni" },
  { label: "Nuova Spesa", href: "/spese/nuova", group: "Azioni" },
  { label: "Nuovo Cliente", href: "/anagrafiche/clienti/nuovo", group: "Azioni" },
  { label: "Nuovo Fornitore", href: "/anagrafiche/fornitori/nuovo", group: "Azioni" },
  // Fiscale
  { label: "Report IVA", href: "/fiscale/iva", group: "Fiscale" },
  { label: "Report IRPF", href: "/fiscale/irpf", group: "Fiscale" },
  // Import
  { label: "Import CSV", href: "/import/csv", group: "Importazioni" },
  { label: "Import PDF", href: "/import/pdf", group: "Importazioni" },
  // Impostazioni
  { label: "Impostazioni", href: "/impostazioni", group: "Sistema" },
];

const groups = [...new Set(commands.map((c) => c.group))];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cerca pagina o azione..." />
      <CommandList>
        <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
        {groups.map((group, i) => (
          <div key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {commands
                .filter((c) => c.group === group)
                .map((cmd) => (
                  <CommandItem
                    key={cmd.href}
                    value={`${cmd.label} ${cmd.group}`}
                    onSelect={() => handleSelect(cmd.href)}
                  >
                    {cmd.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
