"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/DataTable";
import { ClientListItem } from "./actions";
import Link from "next/link";

interface ClientListProps {
  clients: ClientListItem[];
  totalCount: number;
  page: number;
  search: string;
}

const columns: Column<ClientListItem>[] = [
  { key: "name", header: "Nome" },
  { key: "vatNumber", header: "Partita IVA" },
  { key: "country", header: "Paese" },
  { key: "email", header: "Email" },
];

export default function ClientList({ clients, totalCount, page, search }: ClientListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateTo = (params: { search?: string; page?: number }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.search !== undefined) {
      sp.set("search", params.search);
      sp.set("page", "1");
    }
    if (params.page !== undefined) {
      sp.set("page", String(params.page));
    }
    router.push(`/anagrafiche/clienti?${sp.toString()}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
        <Link
          href="/anagrafiche/clienti/nuovo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Nuovo Cliente
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        totalCount={totalCount}
        page={page}
        pageSize={10}
        searchValue={search}
        searchPlaceholder="Cerca per nome o partita IVA..."
        onSearch={(query) => navigateTo({ search: query })}
        onPageChange={(newPage) => navigateTo({ page: newPage })}
      />
    </div>
  );
}
