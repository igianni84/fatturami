"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import {
  PurchaseInvoiceListItem,
  SupplierOption,
  updatePurchaseInvoiceStatus,
  deletePurchaseInvoice,
} from "./actions";
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
import { purchaseInvoiceStatusLabels as statusLabels, expenseCategoryLabels as categoryLabels } from "@/lib/labels";

interface PurchaseInvoiceListProps {
  purchaseInvoices: PurchaseInvoiceListItem[];
  totalCount: number;
  page: number;
  suppliers: SupplierOption[];
  currentStatus: string;
  currentSupplierId: string;
  currentCategory: string;
  currentDateFrom: string;
  currentDateTo: string;
}

const allStatuses = ["tutti", "registrata", "pagata"];
const allCategories = [
  "tutte",
  "servizi_professionali",
  "software",
  "hardware",
  "viaggi",
  "telecomunicazioni",
  "trasporti",
  "pasti",
  "materiale_ufficio",
  "altro",
];

export default function PurchaseInvoiceList({
  purchaseInvoices,
  totalCount,
  page,
  suppliers,
  currentStatus,
  currentSupplierId,
  currentCategory,
  currentDateFrom,
  currentDateTo,
}: PurchaseInvoiceListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseInvoiceListItem | null>(null);

  const navigateTo = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "" || value === "tutti" || value === "tutte") {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    }
    if (params.page === undefined && !("page" in params)) {
      sp.set("page", "1");
    }
    router.push(`/acquisti?${sp.toString()}`);
  };

  const handleMarkPaid = async (id: string) => {
    await updatePurchaseInvoiceStatus(id, "pagata");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const result = await deletePurchaseInvoice(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!result.success) {
      toast.error(result.message || "Errore durante l'eliminazione");
    }
    router.refresh();
  };

  const columns: Column<PurchaseInvoiceListItem>[] = [
    { key: "supplierName", header: "Fornitore" },
    { key: "number", header: "Numero" },
    { key: "date", header: "Data" },
    {
      key: "category",
      header: "Categoria",
      render: (item) => categoryLabels[item.category] || item.category,
    },
    {
      key: "total",
      header: "Totale",
      render: (item) =>
        `€ ${item.total.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
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
        <h1 className="text-2xl font-bold text-gray-900">Fatture di acquisto</h1>
        <Button asChild>
          <Link href="/acquisti/nuovo">+ Nuova fattura acquisto</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {allStatuses.map((status) => (
            <Button
              key={status}
              variant={currentStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => navigateTo({ status, page: "1" })}
            >
              {status === "tutti" ? "Tutti" : statusLabels[status]}
            </Button>
          ))}
        </div>

        {/* Supplier, category, and date range filters */}
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fornitore
            </label>
            <select
              value={currentSupplierId}
              onChange={(e) =>
                navigateTo({ supplierId: e.target.value, page: "1" })
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            >
              <option value="">Tutti</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Categoria
            </label>
            <select
              value={currentCategory}
              onChange={(e) =>
                navigateTo({ category: e.target.value, page: "1" })
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "tutte" ? "Tutte" : categoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Da
            </label>
            <input
              type="date"
              value={currentDateFrom}
              onChange={(e) =>
                navigateTo({ dateFrom: e.target.value, page: "1" })
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              A
            </label>
            <input
              type="date"
              value={currentDateTo}
              onChange={(e) =>
                navigateTo({ dateTo: e.target.value, page: "1" })
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={purchaseInvoices}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        emptyMessage="Nessuna fattura di acquisto trovata"
        onPageChange={(newPage) => navigateTo({ page: String(newPage) })}
        onRowClick={(item) => router.push(`/acquisti/${item.id}`)}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Azioni fattura acquisto">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.status === "registrata" && (
                <DropdownMenuItem onClick={() => handleMarkPaid(item.id)}>
                  Segna come pagata
                </DropdownMenuItem>
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
        description={<>Sei sicuro di voler eliminare la fattura di acquisto <strong>{deleteConfirm?.number}</strong>? Questa azione non può essere annullata.</>}
        confirmLabel="Elimina"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
