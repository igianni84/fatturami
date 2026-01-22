"use client";

import { useState, useEffect } from "react";
import { IRPFReportData, getIRPFReport } from "./actions";

interface IRPFReportProps {
  initialData: IRPFReportData;
  initialYear: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default function IRPFReport({ initialData, initialYear }: IRPFReportProps) {
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<IRPFReportData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (year === initialYear) return;
    setLoading(true);
    getIRPFReport(year).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [year, initialYear]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stima IRPF (Modelo 130)</h1>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Anno</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={loading ? "opacity-60" : ""}>
        {/* Quarterly breakdown */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pagos Fraccionados Trimestrali (20% reddito netto)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Trimestre</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Ricavi</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Spese deducibili</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Reddito netto</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Pago fraccionado</th>
                </tr>
              </thead>
              <tbody>
                {data.quarterlyData.map((q) => (
                  <tr key={q.quarter} className="border-b">
                    <td className="px-4 py-2 text-left font-medium">Q{q.quarter}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(q.revenue)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatCurrency(q.deductibleExpenses)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={q.netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(q.netIncome)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-blue-600">
                      {formatCurrency(q.pagoFraccionado)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-left">Totale annuale</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(data.annualSummary.totalRevenue)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(data.annualSummary.totalDeductibleExpenses)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={data.annualSummary.netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(data.annualSummary.netIncome)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-blue-600">{formatCurrency(data.annualSummary.totalPagosFraccionados)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Annual IRPF Summary */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Reddito netto annuale</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(data.annualSummary.netIncome)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ricavi - Spese deducibili</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">IRPF stimato annuale</h3>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(data.annualSummary.estimatedIRPF)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Applicando scaglioni fiscali</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Totale pagos fraccionados</h3>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {formatCurrency(data.annualSummary.totalPagosFraccionados)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Acconti trimestrali versati</p>
          </div>
        </div>

        {/* IRPF Brackets */}
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scaglioni IRPF (2024)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Scaglione</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Aliquota</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Imponibile nello scaglione</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Imposta</th>
                </tr>
              </thead>
              <tbody>
                {data.annualSummary.brackets.map((bracket, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2 text-left">
                      {formatCurrency(bracket.from)} - {bracket.to !== null ? formatCurrency(bracket.to) : "oltre"}
                    </td>
                    <td className="px-4 py-2 text-right">{bracket.rate}%</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(bracket.taxableInBracket)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatCurrency(bracket.tax)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={2} className="px-4 py-2 text-left">Totale IRPF stimato</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(Math.max(0, data.annualSummary.netIncome))}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(data.annualSummary.estimatedIRPF)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Withholdings note */}
        {data.annualSummary.totalWithholdings > 0 && (
          <div className="mt-6 rounded-lg border bg-yellow-50 border-yellow-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ritenute IRPF</h3>
            <p className="text-sm text-gray-600">
              Ritenute IRPF da clienti spagnoli: <span className="font-semibold">{formatCurrency(data.annualSummary.totalWithholdings)}</span>
            </p>
          </div>
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
