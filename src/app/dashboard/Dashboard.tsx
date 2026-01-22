"use client";

import { useState, useEffect } from "react";
import { getDashboardData, DashboardData } from "./actions";
import Link from "next/link";

const periodLabels: Record<string, string> = {
  month: "Mese",
  quarter: "Trimestre",
  year: "Anno",
};

function formatCurrency(amount: number, currency: string = "EUR"): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol} ${amount.toFixed(2)}`;
}

export default function Dashboard({ initialData }: { initialData: DashboardData }) {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getDashboardData(period);
        setData(result);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {Object.entries(periodLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                period === key
                  ? "bg-white text-gray-900 shadow-sm font-medium"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 ${loading ? "opacity-60" : ""}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Fatturato</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(data.metrics.revenue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Fatture emesse nel periodo</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Spese</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(data.metrics.expenses)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Acquisti + spese nel periodo</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Saldo</p>
          <p className={`text-2xl font-bold ${data.metrics.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {formatCurrency(data.metrics.balance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Fatturato - Spese</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Fatture Scadute</p>
          <p className={`text-2xl font-bold ${data.metrics.overdueCount > 0 ? "text-orange-600" : "text-gray-900"}`}>
            {data.metrics.overdueCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Da incassare</p>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Documenti Recenti</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {data.recentDocuments.length === 0 ? (
            <p className="px-6 py-4 text-gray-500 text-sm">Nessun documento recente</p>
          ) : (
            data.recentDocuments.map((doc) => (
              <div key={`${doc.type}-${doc.id}`} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      doc.type === "invoice"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {doc.type === "invoice" ? "Fattura" : "Acquisto"}
                  </span>
                  <div>
                    <Link
                      href={doc.type === "invoice" ? `/fatture/${doc.id}` : `/acquisti`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {doc.number}
                    </Link>
                    <p className="text-xs text-gray-500">{doc.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(doc.total, doc.currency)}
                  </p>
                  <p className="text-xs text-gray-500">{doc.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
