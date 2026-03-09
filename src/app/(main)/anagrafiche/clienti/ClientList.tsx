"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { ClientListItem, deleteClient } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface ClientListProps {
  clients: ClientListItem[];
  totalCount: number;
  page: number;
  search: string;
}

const columns: Column<ClientListItem>[] = [
  { key: "name", header: "Nome" },
  { key: "vatNumber", header: "Partita IVA" },
  { key: "country", header: "Paese" },
  { key: "email", header: "Email" },
];

export default function ClientList({ clients, totalCount, page, search }: ClientListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<ClientListItem | null>(null);

  const navigateTo = (params: { search?: string; page?: number }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.search !== undefined) {
      sp.set("search", params.search);
      sp.set("page", "1");
    }
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    router.push(`/anagrafiche/clienti?${sp.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteClient(deleteConfirm.id);
    setDeleteConfirm(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
        <Button asChild>
          <Link href="/anagrafiche/clienti/nuovo">+ Nuovo Cliente</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        searchValue={search}
        searchPlaceholder="Cerca per nome o partita IVA..."
        emptyMessage="Nessun cliente trovato"
        onSearch={(query) => navigateTo({ search: query })}
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        onRowClick={(item) => router.push(`/anagrafiche/clienti/${item.id}/modifica`)}
        actions={(item) => (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/anagrafiche/clienti/${item.id}/modifica`}>
                Modifica
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(item)}
            >
              Elimina
            </Button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Conferma eliminazione"
        description={
          <>
            Sei sicuro di voler eliminare il cliente{" "}
            <strong>{deleteConfirm?.name}</strong>? Questa azione non può
            essere annullata.
          </>
        }
        confirmLabel="Elimina"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
