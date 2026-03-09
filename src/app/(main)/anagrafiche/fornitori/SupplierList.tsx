"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { SupplierListItem, deleteSupplier } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
        <Button asChild>
          <Link href="/anagrafiche/fornitori/nuovo">+ Nuovo Fornitore</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        searchValue={search}
        searchPlaceholder="Cerca per nome o partita IVA..."
        emptyMessage="Nessun fornitore trovato"
        onSearch={(query) => navigateTo({ search: query })}
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        onRowClick={(item) => router.push(`/anagrafiche/fornitori/${item.id}/modifica`)}
        actions={(item) => (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/anagrafiche/fornitori/${item.id}/modifica`}>
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
            Sei sicuro di voler eliminare il fornitore{" "}
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
