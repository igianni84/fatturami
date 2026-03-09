"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onSearch?: (query: string) => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
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
  emptyMessage,
  emptyAction,
  onSearch,
  onPageChange,
  onRowClick,
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
        <div className="mb-4" role="search">
          <Input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={String(col.key)}>{col.header}</TableHead>
              ))}
              {actions && (
                <TableHead className="w-10"><span className="sr-only">Azioni</span></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <p className="text-muted-foreground">{emptyMessage || "Nessun risultato trovato"}</p>
                  {emptyAction && <div className="mt-2">{emptyAction}</div>}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow
                  key={item.id}
                  className={onRowClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : undefined}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(item); } } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={`${item.id}-${String(col.key)}`}>
                      {col.render
                        ? col.render(item)
                        : String(
                            (item as Record<string, unknown>)[
                              col.key as string
                            ] ?? ""
                          )}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <nav aria-label="Paginazione" className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} ({totalCount} risultati)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Successivo
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
