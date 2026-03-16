"use client";

import { useState, useEffect } from "react";
import { VATReportData, getVATReport } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv-export";
import { formatCurrencyES } from "@/lib/formatting";

interface VATReportProps {
  initialData: VATReportData;
  initialYear: number;
  initialQuarter: number;
}

export default function VATReport({ initialData, initialYear, initialQuarter }: VATReportProps) {
  const [year, setYear] = useState(initialYear);
  const [quarter, setQuarter] = useState(initialQuarter);
  const [data, setData] = useState<VATReportData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (year === initialYear && quarter === initialQuarter) return;

    let cancelled = false;
    setLoading(true);

    getVATReport(year, quarter)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        // Server action failed — keep previous data visible
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // initialYear/initialQuarter are constant props, excluded intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  function exportBreakdownCSV() {
    const headers = ["Aliquota", "Tasso %", "Base vendite", "IVA vendite", "Base acquisti", "IVA acquisti", "Saldo"];
    const rows = data.breakdown.map((item) => [
      `${item.rateName} (${item.rate}%)`,
      item.rate,
      item.salesBase.toFixed(2),
      item.salesTax.toFixed(2),
      item.purchasesBase.toFixed(2),
      item.purchasesTax.toFixed(2),
      (item.salesTax - item.purchasesTax).toFixed(2),
    ]);
    rows.push(["Totale", "", data.ivaRepercutidaBase.toFixed(2), data.ivaRepercutida.toFixed(2), data.ivaSoportadaDeducibleBase.toFixed(2), data.ivaSoportadaDeducible.toFixed(2), data.ivaResult.toFixed(2)]);
    downloadCSV(`iva-dettaglio-Q${quarter}-${year}.csv`, headers, rows);
  }

  function exportIntraEUCSV() {
    const headers = ["Cliente", "Partita IVA", "Paese", "Fattura", "Data", "Importo"];
    const rows = data.intraEUOperations.map((op) => [
      op.clientName,
      op.vatNumber,
      op.country,
      op.invoiceNumber,
      op.date,
      op.amount.toFixed(2),
    ]);
    const total = data.intraEUOperations.reduce((sum, op) => sum + op.amount, 0);
    rows.push(["Totale", "", "", "", "", total.toFixed(2)]);
    downloadCSV(`intra-ue-Q${quarter}-${year}.csv`, headers, rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dichiarazione IVA Trimestrale (Modelo 303)</h1>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anno</label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((q) => (
              <Button
                key={q}
                variant={quarter === q ? "default" : "outline"}
                size="sm"
                onClick={() => setQuarter(q)}
              >
                Q{q}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className={`transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">IVA Repercutida</CardTitle>
              <p className="text-xs text-muted-foreground">IVA sulle vendite nazionali</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrencyES(data.ivaRepercutida)}</p>
              <p className="text-sm text-muted-foreground mt-1">Base imponibile: {formatCurrencyES(data.ivaRepercutidaBase)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">IVA Soportada Deducible</CardTitle>
              <p className="text-xs text-muted-foreground">IVA deducibile sugli acquisti</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrencyES(data.ivaSoportadaDeducible)}</p>
              <p className="text-sm text-muted-foreground mt-1">Base imponibile: {formatCurrencyES(data.ivaSoportadaDeducibleBase)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Risultato IVA</CardTitle>
              <p className="text-xs text-muted-foreground">
                {data.ivaResult >= 0 ? "Da versare" : "A credito"}
              </p>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${data.ivaResult >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrencyES(data.ivaResult)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown by rate */}
        {data.breakdown.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dettaglio per aliquota</CardTitle>
              <Button variant="outline" size="sm" onClick={exportBreakdownCSV}>
                Esporta CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aliquota</TableHead>
                    <TableHead className="text-right">Base vendite</TableHead>
                    <TableHead className="text-right">IVA vendite</TableHead>
                    <TableHead className="text-right">Base acquisti</TableHead>
                    <TableHead className="text-right">IVA acquisti</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.breakdown.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.rateName} ({item.rate}%)
                      </TableCell>
                      <TableCell className="text-right">{formatCurrencyES(item.salesBase)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrencyES(item.salesTax)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyES(item.purchasesBase)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrencyES(item.purchasesTax)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyES(item.salesTax - item.purchasesTax)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Totale</TableCell>
                    <TableCell className="text-right">{formatCurrencyES(data.ivaRepercutidaBase)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrencyES(data.ivaRepercutida)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyES(data.ivaSoportadaDeducibleBase)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrencyES(data.ivaSoportadaDeducible)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyES(data.ivaResult)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Intra-EU operations */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Operazioni Intra-UE (Modelo 349)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Riepilogo delle operazioni con soggetti intracomunitari nel trimestre
              </p>
            </div>
            {data.intraEUOperations.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportIntraEUCSV}>
                Esporta CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.intraEUOperations.length === 0 ? (
              <p className="text-muted-foreground italic">Nessuna operazione intra-UE nel periodo selezionato.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Partita IVA</TableHead>
                    <TableHead>Paese</TableHead>
                    <TableHead>Fattura</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.intraEUOperations.map((op, index) => (
                    <TableRow key={index}>
                      <TableCell>{op.clientName}</TableCell>
                      <TableCell className="font-mono text-xs">{op.vatNumber}</TableCell>
                      <TableCell>{op.country}</TableCell>
                      <TableCell>{op.invoiceNumber}</TableCell>
                      <TableCell>{op.date}</TableCell>
                      <TableCell className="text-right">{formatCurrencyES(op.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5}>Totale operazioni intra-UE</TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyES(data.intraEUOperations.reduce((sum, op) => sum + op.amount, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
