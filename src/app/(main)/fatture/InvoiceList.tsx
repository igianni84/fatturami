"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { InvoiceListItem, updateInvoiceStatus, deleteInvoice } from "./actions";
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
import { PaymentDateDialog } from "@/components/PaymentDateDialog";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { getStatusColor } from "@/lib/status-colors";

interface InvoiceListProps {
  invoices: InvoiceListItem[];
  totalCount: number;
  page: number;
  currentStatus: string;
}

const statusLabels: Record<string, string> = {
  bozza: "Bozza",
  emessa: "Emessa",
  inviata: "Inviata",
  pagata: "Pagata",
  scaduta: "Scaduta",
};

const statusTransitions: Record<string, string[]> = {
  bozza: ["emessa"],
  emessa: ["inviata", "pagata", "scaduta"],
  inviata: ["pagata", "scaduta"],
  pagata: [],
  scaduta: ["pagata"],
};

const allStatuses = ["tutti", "bozza", "emessa", "inviata", "pagata", "scaduta"];

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol} ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InvoiceList({
  invoices,
  totalCount,
  page,
  currentStatus,
}: InvoiceListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<InvoiceListItem | null>(null);
  const [paymentConfirm, setPaymentConfirm] = useState<InvoiceListItem | null>(null);

  const navigateTo = (params: { page?: number; status?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    if (params.status !== undefined) {
      if (params.status === "tutti") {
        sp.delete("status");
      } else {
        sp.set("status", params.status);
      }
      sp.set("page", "1");
    }
    router.push(`/fatture?${sp.toString()}`);
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    if (newStatus === "pagata") {
      const inv = invoices.find((i) => i.id === invoiceId);
      setPaymentConfirm(inv || null);
      return;
    }
    await updateInvoiceStatus(invoiceId, newStatus);
    router.refresh();
  };

  const handlePaymentConfirm = async (paidAt: string) => {
    if (!paymentConfirm) return;
    const result = await updateInvoiceStatus(paymentConfirm.id, "pagata", paidAt);
    setPaymentConfirm(null);
    if (!result.success) {
      toast.error(result.message || "Errore durante l'aggiornamento");
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const result = await deleteInvoice(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!result.success) {
      toast.error(result.message || "Errore durante l'eliminazione");
    }
    router.refresh();
  };

  const columns: Column<InvoiceListItem>[] = [
    { key: "number", header: "Numero" },
    { key: "clientName", header: "Cliente" },
    { key: "date", header: "Data" },
    {
      key: "total",
      header: "Totale",
      render: (item) => formatCurrency(item.total, item.currency),
    },
    {
      key: "currency",
      header: "Valuta",
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
        <h1 className="text-2xl font-bold text-gray-900">Fatture</h1>
        <Button asChild>
          <Link href="/fatture/nuova">+ Nuova Fattura</Link>
        </Button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {allStatuses.map((status) => (
          <Button
            key={status}
            variant={currentStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => navigateTo({ status })}
          >
            {status === "tutti" ? "Tutti" : statusLabels[status]}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        emptyMessage="Nessuna fattura trovata"
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        onRowClick={(item) => router.push(`/fatture/${item.id}`)}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Azioni fattura">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.status === "bozza" && (
                <DropdownMenuItem asChild>
                  <Link href={`/fatture/${item.id}/modifica`}>Modifica</Link>
                </DropdownMenuItem>
              )}
              {statusTransitions[item.status]?.length > 0 && (
                <>
                  {statusTransitions[item.status].map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(item.id, status)}
                    >
                      Segna come {statusLabels[status].toLowerCase()}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
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
        description={<>Sei sicuro di voler eliminare la fattura <strong>{deleteConfirm?.number}</strong>? Questa azione non può essere annullata.</>}
        confirmLabel="Elimina"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <PaymentDateDialog
        open={!!paymentConfirm}
        onOpenChange={(open) => !open && setPaymentConfirm(null)}
        onConfirm={handlePaymentConfirm}
        invoiceNumber={paymentConfirm?.number}
      />
    </div>
  );
}
