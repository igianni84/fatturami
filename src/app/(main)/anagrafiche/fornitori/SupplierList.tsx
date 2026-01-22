"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { SupplierListItem, deleteSupplier } from "./actions";
import Link from "next/link";

interface SupplierListProps {
  suppliers: SupplierListItem[];
  totalCount: number;
  page: number;
  search: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  servizi_professionali: "Servizi professionali",
  software: "Software",
  hardware: "Hardware",
  viaggi: "Viaggi",
  telecomunicazioni: "Telecomunicazioni",
  trasporti: "Trasporti",
  pasti: "Pasti",
  materiale_ufficio: "Materiale ufficio",
  altro: "Altro",
};

const columns: Column<SupplierListItem>[] = [
  { key: "name", header: "Nome" },
  { key: "vatNumber", header: "Partita IVA" },
  { key: "country", header: "Paese" },
  { key: "email", header: "Email" },
  {
    key: "expenseCategory",
    header: "Categoria",
    render: (item) => CATEGORY_LABELS[item.expenseCategory] || item.expenseCategory,
  },
];

export default function SupplierList({ suppliers, totalCount, page, search }: SupplierListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<SupplierListItem | null>(null);

  const navigateTo = (params: { search?: string; page?: number }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.search !== undefined) {
      sp.set("search", params.search);
      sp.set("page", "1");
    }
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    router.push(`/anagrafiche/fornitori?${sp.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteSupplier(deleteConfirm.id);
    setDeleteConfirm(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fornitori</h1>
        <Link
          href="/anagrafiche/fornitori/nuovo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Nuovo Fornitore
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
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
              href={`/anagrafiche/fornitori/${item.id}/modifica`}
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
              Sei sicuro di voler eliminare il fornitore <strong>{deleteConfirm.name}</strong>? Questa azione non può essere annullata.
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
