"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { ClientListItem, deleteClient } from "./actions";
import Link from "next/link";

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
        <Link
          href="/anagrafiche/clienti/nuovo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Nuovo Cliente
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        searchValue={search}
        searchPlaceholder="Cerca per nome o partita IVA..."
        onSearch={(query) => navigateTo({ search: query })}
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        actions={(item) => (
          <div className="flex gap-2 justify-end">
            <Link
              href={`/anagrafiche/clienti/${item.id}/modifica`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Modifica
            </Link>
            <button
              onClick={() => setDeleteConfirm(item)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Elimina
            </button>
          </div>
        )}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Conferma eliminazione
            </h2>
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler eliminare il cliente <strong>{deleteConfirm.name}</strong>? Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
