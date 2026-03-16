"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { ExpenseListItem, deleteExpense } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { expenseCategoryLabels as categoryLabels } from "@/lib/labels";

interface ExpenseListProps {
  expenses: ExpenseListItem[];
  totalCount: number;
  totalAmount: number;
  page: number;
  currentCategory: string;
  currentDateFrom: string;
  currentDateTo: string;
  currentDeductible: string;
}

const allCategories = [
  "tutte",
  "trasporti",
  "pasti",
  "materiale_ufficio",
  "telecomunicazioni",
  "servizi_professionali",
  "software",
  "hardware",
  "viaggi",
  "altro",
];

const deductibleOptions = [
  { value: "tutti", label: "Tutti" },
  { value: "si", label: "Deducibili" },
  { value: "no", label: "Non deducibili" },
];

export default function ExpenseList({
  expenses,
  totalCount,
  totalAmount,
  page,
  currentCategory,
  currentDateFrom,
  currentDateTo,
  currentDeductible,
}: ExpenseListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteConfirm, setDeleteConfirm] = useState<ExpenseListItem | null>(null);

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
    router.push(`/spese?${sp.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const result = await deleteExpense(deleteConfirm.id);
    setDeleteConfirm(null);
    if (!result.success) {
      toast.error(result.message || "Errore durante l'eliminazione");
    }
    router.refresh();
  };

  const columns: Column<ExpenseListItem>[] = [
    { key: "date", header: "Data" },
    { key: "description", header: "Descrizione" },
    {
      key: "category",
      header: "Categoria",
      render: (item) => categoryLabels[item.category] || item.category,
    },
    {
      key: "amount",
      header: "Importo",
      render: (item) =>
        `€ ${item.amount.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
    },
    {
      key: "deductible",
      header: "Deducibile",
      render: (item) => (
        <Badge
          variant="outline"
          className={
            item.deductible
              ? "border-green-300 bg-green-100 text-green-800"
              : "border-red-300 bg-red-100 text-red-800"
          }
        >
          {item.deductible ? "Sì" : "No"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Spese</h1>
        <Button asChild>
          <Link href="/spese/nuova">+ Nuova Spesa</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Deductible filter */}
        <div className="flex gap-2 flex-wrap">
          {deductibleOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={currentDeductible === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => navigateTo({ deductible: opt.value, page: "1" })}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Category and date range filters */}
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Categoria
            </label>
            <select
              value={currentCategory}
              onChange={(e) =>
                navigateTo({ category: e.target.value, page: "1" })
              }
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
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
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
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
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Total amount */}
      <div className="mb-4 p-3 bg-muted rounded-md border">
        <span className="text-sm text-gray-600">Totale filtrato: </span>
        <span className="text-sm font-semibold text-gray-900">
          € {totalAmount.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="text-sm text-gray-500 ml-2">
          ({totalCount} {totalCount === 1 ? "spesa" : "spese"})
        </span>
      </div>

      <DataTable
        columns={columns}
        data={expenses}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        emptyMessage="Nessuna spesa trovata"
        onPageChange={(newPage) => navigateTo({ page: String(newPage) })}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Azioni spesa">
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
        description={
          <>
            Sei sicuro di voler eliminare la spesa{" "}
            <strong>{deleteConfirm?.description}</strong>? Questa azione non
            può essere annullata.
          </>
        }
        confirmLabel="Elimina"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
