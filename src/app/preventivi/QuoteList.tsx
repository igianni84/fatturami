"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { QuoteListItem, updateQuoteStatus } from "./actions";
import { convertQuoteToInvoice } from "@/app/fatture/actions";
import Link from "next/link";

interface QuoteListProps {
  quotes: QuoteListItem[];
  totalCount: number;
  page: number;
}

const statusColors: Record<string, string> = {
  bozza: "bg-gray-100 text-gray-800",
  inviato: "bg-blue-100 text-blue-800",
  accettato: "bg-green-100 text-green-800",
  rifiutato: "bg-red-100 text-red-800",
  scaduto: "bg-yellow-100 text-yellow-800",
  convertito: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  scaduto: "Scaduto",
  convertito: "Convertito",
};

const statusTransitions: Record<string, string[]> = {
  bozza: ["inviato"],
  inviato: ["accettato", "rifiutato", "scaduto"],
  accettato: [],
  rifiutato: [],
  scaduto: [],
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function QuoteList({ quotes, totalCount, page }: QuoteListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  const navigateTo = (params: { page?: number }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    router.push(`/preventivi?${sp.toString()}`);
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    setStatusMenuId(null);
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
      alert(result.message || "Errore durante la conversione");
    }
  };

  const columns: Column<QuoteListItem>[] = [
    { key: "number", header: "Numero" },
    { key: "clientName", header: "Cliente" },
    { key: "date", header: "Data" },
    { key: "expiryDate", header: "Scadenza", render: (item) => item.expiryDate || "—" },
    {
      key: "total",
      header: "Totale",
      render: (item) => `€ ${formatCurrency(item.total)}`,
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
        <h1 className="text-2xl font-bold text-gray-900">Preventivi</h1>
        <Link
          href="/preventivi/nuovo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Nuovo Preventivo
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={quotes}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        actions={(item) => (
          <div className="flex gap-2 justify-end items-center relative">
            {item.status === "bozza" && (
              <Link
                href={`/preventivi/${item.id}/modifica`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Modifica
              </Link>
            )}
            {item.status === "accettato" && (
              <button
                onClick={() => handleConvert(item.id)}
                disabled={converting === item.id}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium disabled:opacity-50"
              >
                {converting === item.id ? "Conversione..." : "Converti in fattura"}
              </button>
            )}
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
