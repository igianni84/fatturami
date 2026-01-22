"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { ExpenseListItem } from "./actions";
import Link from "next/link";

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

const categoryLabels: Record<string, string> = {
  trasporti: "Trasporti",
  pasti: "Pasti",
  materiale_ufficio: "Materiale ufficio",
  telecomunicazioni: "Telecomunicazioni",
  servizi_professionali: "Servizi professionali",
  software: "Software",
  hardware: "Hardware",
  viaggi: "Viaggi",
  altro: "Altro",
};

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
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.deductible
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.deductible ? "Sì" : "No"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Spese</h1>
        <Link
          href="/spese/nuova"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Nuova Spesa
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Deductible filter */}
        <div className="flex gap-2 flex-wrap">
          {deductibleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => navigateTo({ deductible: opt.value, page: "1" })}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                currentDeductible === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
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

      {/* Total amount */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
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
        onPageChange={(newPage) => navigateTo({ page: String(newPage) })}
      />
    </div>
  );
}
