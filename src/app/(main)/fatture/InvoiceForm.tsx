"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClientOptionWithVat,
  TaxRateOption,
  InvoiceFormData,
  createInvoice,
} from "./actions";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId: string;
}

interface InvoiceFormProps {
  clients: ClientOptionWithVat[];
  taxRates: TaxRateOption[];
}

function emptyLine(): LineItem {
  return { description: "", quantity: 1, unitPrice: 0, taxRateId: "" };
}

// VAT regime to tax rate type mapping
function getDefaultTaxRateType(
  vatRegime: string,
  hasValidVat: boolean
): string {
  switch (vatRegime) {
    case "nazionale":
      return "standard";
    case "intraUE":
      return hasValidVat ? "reverse_charge" : "standard";
    case "extraUE":
      return "export_exempt";
    default:
      return "standard";
  }
}

export default function InvoiceForm({ clients, taxRates }: InvoiceFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // Selected client info
  const selectedClient = clients.find((c) => c.id === clientId);
  const vatRegimeLabel = selectedClient
    ? getVatRegimeLabel(selectedClient.vatRegime)
    : "";

  function getVatRegimeLabel(regime: string): string {
    switch (regime) {
      case "nazionale":
        return "Nazionale (IVA 21%)";
      case "intraUE":
        return selectedClient?.vatNumber
          ? "Intra-UE (Reverse Charge 0%)"
          : "Intra-UE (IVA 21% - senza partita IVA valida)";
      case "extraUE":
        return "Extra-UE (Esente 0%)";
      default:
        return "";
    }
  }

  // When client changes, auto-set currency and tax rates on lines
  useEffect(() => {
    if (!selectedClient) return;

    // Set client's preferred currency
    if (selectedClient.currency) {
      setCurrency(selectedClient.currency);
      if (selectedClient.currency === "EUR") {
        setExchangeRate(1);
      }
    }

    // Determine the default tax rate type for this client
    const defaultType = getDefaultTaxRateType(
      selectedClient.vatRegime,
      !!selectedClient.vatNumber
    );

    // Find the matching tax rate
    const matchingRate = taxRates.find((r) => r.type === defaultType);
    if (matchingRate) {
      setLines((prev) =>
        prev.map((l) => ({ ...l, taxRateId: matchingRate.id }))
      );
    }
  }, [clientId, selectedClient, taxRates]);

  function getTaxRate(taxRateId: string): number {
    const rate = taxRates.find((r) => r.id === taxRateId);
    return rate ? rate.rate : 0;
  }

  function lineSubtotal(line: LineItem): number {
    return line.quantity * line.unitPrice;
  }

  function lineTax(line: LineItem): number {
    return lineSubtotal(line) * (getTaxRate(line.taxRateId) / 100);
  }

  function lineTotal(line: LineItem): number {
    return lineSubtotal(line) + lineTax(line);
  }

  const totalSubtotal = lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
  const totalTax = lines.reduce((sum, l) => sum + lineTax(l), 0);
  const totalAmount = totalSubtotal + totalTax;

  function updateLine(
    index: number,
    field: keyof LineItem,
    value: string | number
  ) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  function addLine() {
    // New lines get the auto-selected tax rate based on client
    const defaultType = selectedClient
      ? getDefaultTaxRateType(
          selectedClient.vatRegime,
          !!selectedClient.vatNumber
        )
      : "standard";
    const matchingRate = taxRates.find((r) => r.type === defaultType);
    setLines((prev) => [
      ...prev,
      { ...emptyLine(), taxRateId: matchingRate?.id || "" },
    ]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const formData: InvoiceFormData = {
      clientId,
      date,
      dueDate,
      currency,
      exchangeRate: Number(exchangeRate),
      notes,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRateId: l.taxRateId,
      })),
    };

    const result = await createInvoice(formData);

    if (result.success) {
      router.push("/fatture");
    } else {
      setErrors(result.errors || {});
      setSaving(false);
    }
  }

  function fieldError(field: string): string | null {
    return errors[field]?.[0] || null;
  }

  function formatCurrency(amount: number): string {
    return amount.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const currencySymbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente *
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">-- Seleziona cliente --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.country})
              </option>
            ))}
          </select>
          {fieldError("clientId") && (
            <p className="text-red-600 text-sm mt-1">
              {fieldError("clientId")}
            </p>
          )}
          {vatRegimeLabel && (
            <p className="text-sm text-blue-600 mt-1">
              Regime IVA: {vatRegimeLabel}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {fieldError("date") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("date")}</p>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data scadenza
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valuta *
          </label>
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              if (e.target.value === "EUR") setExchangeRate(1);
            }}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - Sterlina britannica</option>
            <option value="USD">USD - Dollaro americano</option>
          </select>
          {fieldError("currency") && (
            <p className="text-red-600 text-sm mt-1">
              {fieldError("currency")}
            </p>
          )}
        </div>

        {/* Exchange Rate (only if non-EUR) */}
        {currency !== "EUR" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasso di cambio (1 {currency} = X EUR)
            </label>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) =>
                setExchangeRate(parseFloat(e.target.value) || 1)
              }
              min="0.0001"
              step="0.0001"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {fieldError("exchangeRate") && (
              <p className="text-red-600 text-sm mt-1">
                {fieldError("exchangeRate")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Righe</h3>
        {fieldError("lines") && (
          <p className="text-red-600 text-sm mb-2">{fieldError("lines")}</p>
        )}

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded p-3 bg-gray-50"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Description */}
                <div className="md:col-span-4">
                  <label className="block text-xs text-gray-600 mb-1">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    placeholder="Descrizione servizio/prodotto"
                  />
                </div>

                {/* Quantity */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Quantità
                  </label>
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>

                {/* Unit Price */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Prezzo unit.
                  </label>
                  <input
                    type="number"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>

                {/* Tax Rate */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Aliquota IVA
                  </label>
                  <select
                    value={line.taxRateId}
                    onChange={(e) =>
                      updateLine(index, "taxRateId", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="">-- IVA --</option>
                    {taxRates.map((rate) => (
                      <option key={rate.id} value={rate.id}>
                        {rate.name} ({rate.rate}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Line total + remove */}
                <div className="md:col-span-2 flex items-end gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {currencySymbol} {formatCurrency(lineTotal(line))}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Rimuovi riga"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          + Aggiungi riga
        </button>
      </div>

      {/* Totals */}
      <div className="border-t pt-4">
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Imponibile:</span>
              <span>
                {currencySymbol} {formatCurrency(totalSubtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IVA:</span>
              <span>
                {currencySymbol} {formatCurrency(totalTax)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-1">
              <span>Totale:</span>
              <span>
                {currencySymbol} {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Note
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Note aggiuntive..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio..." : "Salva Fattura"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/fatture")}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
