"use client";

import { useState } from "react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onPageChange?: (page: number) => void;
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  searchValue = "",
  searchPlaceholder = "Cerca...",
  onSearch,
  onPageChange,
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState(searchValue);
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearch) {
      onSearch(search);
    }
  };

  const handleSearchBlur = () => {
    if (onSearch) {
      onSearch(search);
    }
  };

  return (
    <div>
      {onSearch && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            placeholder={searchPlaceholder}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  Nessun risultato trovato
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td
                      key={`${item.id}-${String(col.key)}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key as string] ?? "")}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-700">
            Pagina {page} di {totalPages} ({totalCount} risultati)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Precedente
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Successivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
