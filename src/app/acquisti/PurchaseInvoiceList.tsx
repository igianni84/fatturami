"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import {
  PurchaseInvoiceListItem,
  SupplierOption,
  updatePurchaseInvoiceStatus,
} from "./actions";
import Link from "next/link";

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

const statusColors: Record<string, string> = {
  registrata: "bg-blue-100 text-blue-800",
  pagata: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  registrata: "Registrata",
  pagata: "Pagata",
};

const categoryLabels: Record<string, string> = {
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
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || "bg-gray-100 text-gray-800"}`}
        >
          {statusLabels[item.status] || item.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fatture di acquisto</h1>
        <Link
          href="/acquisti/nuovo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Nuova fattura acquisto
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {allStatuses.map((status) => (
            <button
              key={status}
              onClick={() => navigateTo({ status, page: "1" })}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                currentStatus === status
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {status === "tutti" ? "Tutti" : statusLabels[status]}
            </button>
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
        onPageChange={(newPage) => navigateTo({ page: String(newPage) })}
        actions={(item) => (
          <div className="flex gap-2 justify-end items-center">
            {item.status === "registrata" && (
              <button
                onClick={() => handleMarkPaid(item.id)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Segna pagata
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}
