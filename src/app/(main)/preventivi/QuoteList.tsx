"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { QuoteListItem, updateQuoteStatus, deleteQuote } from "./actions";
import { convertQuoteToInvoice } from "@/app/(main)/fatture/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { getStatusColor } from "@/lib/status-colors";
import { quoteStatusLabels as statusLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/formatting";

interface QuoteListProps {
  quotes: QuoteListItem[];
  totalCount: number;
  page: number;
}

const statusTransitions: Record<string, string[]> = {
  bozza: ["inviato"],
  inviato: ["accettato", "rifiutato", "scaduto"],
  accettato: [],
  rifiutato: [],
  scaduto: [],
};

export default function QuoteList({ quotes, totalCount, page }: QuoteListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [converting, setConverting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<QuoteListItem | null>(null);

  const navigateTo = (params: { page?: number }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    router.push(`/preventivi?${sp.toString()}`);
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    await updateQuoteStatus(quoteId, newStatus);
    router.refresh();
  };

  const handleConvert = async (quoteId: string) => {
    setConverting(quoteId);
    const result = await convertQuoteToInvoice(quoteId);
    if (result.success && result.invoiceId) {
      router.push(`/fatture/${result.invoiceId}`);
    } else {
      setConverting(null);
      toast.error(result.message || "Errore durante la conversione");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const result = await deleteQuote(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!result.success) {
      toast.error(result.message || "Errore durante l'eliminazione");
    }
    router.refresh();
  };

  const columns: Column<QuoteListItem>[] = [
    { key: "number", header: "Numero" },
    { key: "clientName", header: "Cliente" },
    { key: "date", header: "Data" },
    { key: "expiryDate", header: "Scadenza", render: (item) => item.expiryDate || "—" },
    {
      key: "total",
      header: "Totale",
      render: (item) => formatCurrency(item.total),
    },
    {
      key: "status",
      header: "Stato",
      render: (item) => (
        <Badge variant="outline" className={getStatusColor(item.status)}>
          {statusLabels[item.status] || item.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Preventivi</h1>
        <Button asChild>
          <Link href="/preventivi/nuovo">+ Nuovo Preventivo</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={quotes}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        emptyMessage="Nessun preventivo trovato"
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        onRowClick={(item) => router.push(`/preventivi/${item.id}`)}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Azioni preventivo">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.status === "bozza" && (
                <DropdownMenuItem asChild>
                  <Link href={`/preventivi/${item.id}/modifica`}>Modifica</Link>
                </DropdownMenuItem>
              )}
              {item.status === "accettato" && (
                <DropdownMenuItem
                  onClick={() => handleConvert(item.id)}
                  disabled={converting === item.id}
                >
                  {converting === item.id ? "Conversione..." : "Converti in fattura"}
                </DropdownMenuItem>
              )}
              {statusTransitions[item.status]?.length > 0 &&
                statusTransitions[item.status].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(item.id, status)}
                  >
                    Segna come {statusLabels[status].toLowerCase()}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
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
        description={<>Sei sicuro di voler eliminare il preventivo <strong>{deleteConfirm?.number}</strong>? Questa azione non può essere annullata.</>}
        confirmLabel="Elimina"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
