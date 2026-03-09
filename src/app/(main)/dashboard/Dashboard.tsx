"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type DashboardData } from "./actions";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const periodLabels: Record<string, string> = {
  month: "Mese",
  quarter: "Trimestre",
  year: "Anno",
};

function formatCurrency(amount: number, currency: string = "EUR"): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol} ${amount.toFixed(2)}`;
}

export default function Dashboard({ data, period }: { data: DashboardData; period: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (newPeriod === "month") {
      sp.delete("period");
    } else {
      sp.set("period", newPeriod);
    }
    const query = sp.toString();
    startTransition(() => {
      router.push(query ? `/?${query}` : "/");
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-1">
          {Object.entries(periodLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={period === key ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      {isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fatturato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.metrics.revenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Fatture emesse nel periodo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Spese</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.metrics.expenses)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Acquisti + spese nel periodo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${data.metrics.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(data.metrics.balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Fatturato - Spese</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fatture Scadute</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${data.metrics.overdueCount > 0 ? "text-orange-600" : "text-gray-900"}`}>
                {data.metrics.overdueCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Da incassare</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Revenue Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Fatturato Mensile {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRevenue} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(value: number) => `€${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  formatter={(value) => [`€ ${Number(value).toFixed(2)}`, "Fatturato"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documenti Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentDocuments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nessun documento recente</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentDocuments.map((doc) => (
                  <TableRow key={`${doc.type}-${doc.id}`}>
                    <TableCell>
                      <Badge variant={doc.type === "invoice" ? "default" : "secondary"}>
                        {doc.type === "invoice" ? "Fattura" : "Acquisto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={doc.type === "invoice" ? `/fatture/${doc.id}` : `/acquisti`}
                        className="font-medium hover:text-blue-600"
                      >
                        {doc.number}
                      </Link>
                      <p className="text-xs text-muted-foreground">{doc.name}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(doc.total, doc.currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {doc.date}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
