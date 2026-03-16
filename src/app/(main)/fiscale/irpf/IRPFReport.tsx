"use client";

import { useState, useEffect } from "react";
import { IRPFReportData, getIRPFReport } from "./actions";
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
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/csv-export";
import { formatCurrencyES } from "@/lib/formatting";

interface IRPFReportProps {
  initialData: IRPFReportData;
  initialYear: number;
}

export default function IRPFReport({ initialData, initialYear }: IRPFReportProps) {
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<IRPFReportData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (year === initialYear) return;

    let cancelled = false;
    setLoading(true);

    getIRPFReport(year)
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
    // initialYear is a constant prop, excluded intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  function exportQuarterlyCSV() {
    const headers = ["Trimestre", "Ricavi", "Spese deducibili", "Reddito netto", "Pago fraccionado"];
    const rows = data.quarterlyData.map((q) => [
      `Q${q.quarter}`,
      q.revenue.toFixed(2),
      q.deductibleExpenses.toFixed(2),
      q.netIncome.toFixed(2),
      q.pagoFraccionado.toFixed(2),
    ]);
    rows.push([
      "Totale annuale",
      data.annualSummary.totalRevenue.toFixed(2),
      data.annualSummary.totalDeductibleExpenses.toFixed(2),
      data.annualSummary.netIncome.toFixed(2),
      data.annualSummary.totalPagosFraccionados.toFixed(2),
    ]);
    downloadCSV(`irpf-trimestrale-${year}.csv`, headers, rows);
  }

  function exportBracketsCSV() {
    const headers = ["Scaglione da", "Scaglione a", "Aliquota %", "Imponibile nello scaglione", "Imposta"];
    const rows = data.annualSummary.brackets.map((b) => [
      b.from.toFixed(2),
      b.to !== null ? b.to.toFixed(2) : "oltre",
      b.rate,
      b.taxableInBracket.toFixed(2),
      b.tax.toFixed(2),
    ]);
    rows.push(["Totale", "", "", Math.max(0, data.annualSummary.netIncome).toFixed(2), data.annualSummary.estimatedIRPF.toFixed(2)]);
    downloadCSV(`irpf-scaglioni-${year}.csv`, headers, rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stima IRPF (Modelo 130)</h1>
      </div>

      {/* Year selector */}
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
      </div>

      <div className={`transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Quarterly breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pagos Fraccionados Trimestrali (20% reddito netto)</CardTitle>
            <Button variant="outline" size="sm" onClick={exportQuarterlyCSV}>
              Esporta CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trimestre</TableHead>
                  <TableHead className="text-right">Ricavi</TableHead>
                  <TableHead className="text-right">Spese deducibili</TableHead>
                  <TableHead className="text-right">Reddito netto</TableHead>
                  <TableHead className="text-right">Pago fraccionado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.quarterlyData.map((q) => (
                  <TableRow key={q.quarter}>
                    <TableCell className="font-medium">Q{q.quarter}</TableCell>
                    <TableCell className="text-right">{formatCurrencyES(q.revenue)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrencyES(q.deductibleExpenses)}</TableCell>
                    <TableCell className="text-right">
                      <span className={q.netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrencyES(q.netIncome)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatCurrencyES(q.pagoFraccionado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Totale annuale</TableCell>
                  <TableCell className="text-right">{formatCurrencyES(data.annualSummary.totalRevenue)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrencyES(data.annualSummary.totalDeductibleExpenses)}</TableCell>
                  <TableCell className="text-right">
                    <span className={data.annualSummary.netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrencyES(data.annualSummary.netIncome)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-blue-600">{formatCurrencyES(data.annualSummary.totalPagosFraccionados)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Annual IRPF Summary */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reddito netto annuale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrencyES(data.annualSummary.netIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ricavi - Spese deducibili</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">IRPF stimato annuale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrencyES(data.annualSummary.estimatedIRPF)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Applicando scaglioni fiscali</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Totale pagos fraccionados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrencyES(data.annualSummary.totalPagosFraccionados)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Acconti trimestrali versati</p>
            </CardContent>
          </Card>
        </div>

        {/* IRPF Brackets */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Scaglioni IRPF (2024)</CardTitle>
            <Button variant="outline" size="sm" onClick={exportBracketsCSV}>
              Esporta CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scaglione</TableHead>
                  <TableHead className="text-right">Aliquota</TableHead>
                  <TableHead className="text-right">Imponibile nello scaglione</TableHead>
                  <TableHead className="text-right">Imposta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.annualSummary.brackets.map((bracket, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {formatCurrencyES(bracket.from)} - {bracket.to !== null ? formatCurrencyES(bracket.to) : "oltre"}
                    </TableCell>
                    <TableCell className="text-right">{bracket.rate}%</TableCell>
                    <TableCell className="text-right">{formatCurrencyES(bracket.taxableInBracket)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrencyES(bracket.tax)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Totale IRPF stimato</TableCell>
                  <TableCell className="text-right">{formatCurrencyES(Math.max(0, data.annualSummary.netIncome))}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrencyES(data.annualSummary.estimatedIRPF)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Withholdings note */}
        {data.annualSummary.totalWithholdings > 0 && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle>Ritenute IRPF</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Ritenute IRPF da clienti spagnoli: <span className="font-semibold">{formatCurrencyES(data.annualSummary.totalWithholdings)}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info note */}
        <div className="mt-6 rounded-lg border bg-blue-50 border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Questa &egrave; una stima basata sui dati registrati nel sistema.
            Il calcolo reale dell&apos;IRPF pu&ograve; variare in base a deduzioni personali, riduzioni applicabili e altri fattori.
            Consultare un consulente fiscale per la dichiarazione definitiva.
          </p>
        </div>
      </div>
    </div>
  );
}
