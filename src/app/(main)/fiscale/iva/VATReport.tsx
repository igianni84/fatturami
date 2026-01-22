"use client";

import { useState, useEffect } from "react";
import { VATReportData, getVATReport } from "./actions";

interface VATReportProps {
  initialData: VATReportData;
  initialYear: number;
  initialQuarter: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default function VATReport({ initialData, initialYear, initialQuarter }: VATReportProps) {
  const [year, setYear] = useState(initialYear);
  const [quarter, setQuarter] = useState(initialQuarter);
  const [data, setData] = useState<VATReportData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (year === initialYear && quarter === initialQuarter) return;
    setLoading(true);
    getVATReport(year, quarter).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [year, quarter, initialYear, initialQuarter]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dichiarazione IVA Trimestrale (Modelo 303)</h1>
      </div>

      {/* Period selector */}
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
        <div>
          <label className="block text-sm font-medium text-gray-700">Trimestre</label>
          <div className="mt-1 flex gap-2">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  quarter === q
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={loading ? "opacity-60" : ""}>
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">IVA Repercutida</h3>
            <p className="text-xs text-gray-400 mt-1">IVA sulle vendite nazionali</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">{formatCurrency(data.ivaRepercutida)}</p>
            <p className="text-sm text-gray-500 mt-1">Base imponibile: {formatCurrency(data.ivaRepercutidaBase)}</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">IVA Soportada Deducible</h3>
            <p className="text-xs text-gray-400 mt-1">IVA deducibile sugli acquisti</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(data.ivaSoportadaDeducible)}</p>
            <p className="text-sm text-gray-500 mt-1">Base imponibile: {formatCurrency(data.ivaSoportadaDeducibleBase)}</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Risultato IVA</h3>
            <p className="text-xs text-gray-400 mt-1">
              {data.ivaResult >= 0 ? "Da versare" : "A credito"}
            </p>
            <p className={`mt-2 text-2xl font-bold ${data.ivaResult >= 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(data.ivaResult)}
            </p>
          </div>
        </div>

        {/* Breakdown by rate */}
        {data.breakdown.length > 0 && (
          <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dettaglio per aliquota</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Aliquota</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Base vendite</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">IVA vendite</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Base acquisti</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">IVA acquisti</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2 text-left">
                        {item.rateName} ({item.rate}%)
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.salesBase)}</td>
                      <td className="px-4 py-2 text-right text-blue-600">{formatCurrency(item.salesTax)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.purchasesBase)}</td>
                      <td className="px-4 py-2 text-right text-green-600">{formatCurrency(item.purchasesTax)}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatCurrency(item.salesTax - item.purchasesTax)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-2 text-left">Totale</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(data.ivaRepercutidaBase)}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{formatCurrency(data.ivaRepercutida)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(data.ivaSoportadaDeducibleBase)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatCurrency(data.ivaSoportadaDeducible)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(data.ivaResult)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Intra-EU operations */}
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Operazioni Intra-UE (Modelo 349)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Riepilogo delle operazioni con soggetti intracomunitari nel trimestre
          </p>
          {data.intraEUOperations.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nessuna operazione intra-UE nel periodo selezionato.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Cliente</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Partita IVA</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Paese</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Fattura</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Data</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.intraEUOperations.map((op, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{op.clientName}</td>
                      <td className="px-4 py-2 font-mono text-xs">{op.vatNumber}</td>
                      <td className="px-4 py-2">{op.country}</td>
                      <td className="px-4 py-2">{op.invoiceNumber}</td>
                      <td className="px-4 py-2">{op.date}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(op.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={5} className="px-4 py-2 text-left">Totale operazioni intra-UE</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(data.intraEUOperations.reduce((sum, op) => sum + op.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
