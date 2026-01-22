"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { CreditNoteListItem } from "./actions";
import Link from "next/link";

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

  const navigateTo = (params: { page?: number }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    router.push(`/note-credito?${sp.toString()}`);
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
        onPageChange={(newPage) => navigateTo({ page: newPage })}
        actions={(item) => (
          <Link
            href={`/note-credito/${item.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Dettaglio
          </Link>
        )}
      />
    </div>
  );
}
