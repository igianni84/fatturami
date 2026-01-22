"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { InvoiceListItem, updateInvoiceStatus } from "./actions";
import Link from "next/link";

interface InvoiceListProps {
  invoices: InvoiceListItem[];
  totalCount: number;
  page: number;
  currentStatus: string;
}

const statusColors: Record<string, string> = {
  bozza: "bg-gray-100 text-gray-800",
  emessa: "bg-blue-100 text-blue-800",
  inviata: "bg-indigo-100 text-indigo-800",
  pagata: "bg-green-100 text-green-800",
  scaduta: "bg-red-100 text-red-800",
};

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
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

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
    setStatusMenuId(null);
    await updateInvoiceStatus(invoiceId, newStatus);
    router.refresh();
  };

  const columns: Column<InvoiceListItem>[] = [
    { key: "number", header: "Numero" },
    { key: "clientName", header: "Cliente" },
    { key: "date", header: "Data" },
    {
      key: "dueDate",
      header: "Scadenza",
      render: (item) => item.dueDate || "—",
    },
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
        <h1 className="text-2xl font-bold text-gray-900">Fatture</h1>
        <Link
          href="/fatture/nuova"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Nuova Fattura
        </Link>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {allStatuses.map((status) => (
          <button
            key={status}
            onClick={() => navigateTo({ status })}
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

      <DataTable
        columns={columns}
        data={invoices}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        actions={(item) => (
          <div className="flex gap-2 justify-end items-center relative">
            {item.status === "bozza" && (
              <Link
                href={`/fatture/${item.id}/modifica`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Modifica
              </Link>
            )}
            <Link
              href={`/fatture/${item.id}`}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Dettaglio
            </Link>
            {statusTransitions[item.status]?.length > 0 && (
              <div className="relative">
                <button
                  onClick={() =>
                    setStatusMenuId(statusMenuId === item.id ? null : item.id)
                  }
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium border border-gray-300 rounded px-2 py-1"
                >
                  Cambia stato
                </button>
                {statusMenuId === item.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
                    {statusTransitions[item.status].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(item.id, status)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {statusLabels[status]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
