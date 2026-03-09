"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { CreditNoteListItem, deleteCreditNote } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface CreditNoteListProps {
  creditNotes: CreditNoteListItem[];
  totalCount: number;
  page: number;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol} ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CreditNoteList({
  creditNotes,
  totalCount,
  page,
}: CreditNoteListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<CreditNoteListItem | null>(null);

  const navigateTo = (params: { page?: number }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    router.push(`/note-credito?${sp.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const result = await deleteCreditNote(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!result.success) {
      toast.error(result.message || "Errore durante l'eliminazione");
    }
    router.refresh();
  };

  const columns: Column<CreditNoteListItem>[] = [
    { key: "number", header: "Numero" },
    {
      key: "invoiceNumber",
      header: "Fattura di Riferimento",
      render: (item) => (
        <Link
          href={`/fatture/${item.invoiceId}`}
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {item.invoiceNumber}
        </Link>
      ),
    },
    { key: "clientName", header: "Cliente" },
    { key: "date", header: "Data" },
    {
      key: "total",
      header: "Totale",
      render: (item) => formatCurrency(item.total, item.currency),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Note di Credito</h1>
      </div>

      <DataTable
        columns={columns}
        data={creditNotes}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        emptyMessage="Nessuna nota di credito trovata"
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        onRowClick={(item) => router.push(`/note-credito/${item.id}`)}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Azioni nota di credito">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteConfirm(item)}
              >
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Conferma eliminazione"
        description={<>Sei sicuro di voler eliminare la nota di credito <strong>{deleteConfirm?.number}</strong>? Questa azione non può essere annullata.</>}
        confirmLabel="Elimina"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
