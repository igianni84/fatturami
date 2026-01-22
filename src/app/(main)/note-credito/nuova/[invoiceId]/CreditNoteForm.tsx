"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  InvoiceForCreditNote,
  CreditNoteFormData,
  createCreditNote,
} from "../../actions";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId: string;
}

interface CreditNoteFormProps {
  invoice: InvoiceForCreditNote;
}

export default function CreditNoteForm({ invoice }: CreditNoteFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>(
    invoice.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRateId: l.taxRateId,
    }))
  );

  function getTaxRate(taxRateId: string): number {
    const rate = invoice.taxRates.find((r) => r.id === taxRateId);
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

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const formData: CreditNoteFormData = {
      invoiceId: invoice.id,
      date,
      notes,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRateId: l.taxRateId,
      })),
    };

    const result = await createCreditNote(formData);

    if (result.success && result.creditNoteId) {
      router.push(`/note-credito/${result.creditNoteId}`);
    } else {
      setErrors(result.errors || {});
      if (result.message) {
        setErrors({ _form: [result.message] });
      }
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

  const currencySymbol =
    invoice.currency === "EUR"
      ? "€"
      : invoice.currency === "GBP"
        ? "£"
        : "$";

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Reference invoice info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">
          Fattura di Riferimento
        </h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-blue-600">Numero:</dt>
            <dd className="font-medium text-blue-900">{invoice.number}</dd>
          </div>
          <div>
            <dt className="text-blue-600">Cliente:</dt>
            <dd className="font-medium text-blue-900">{invoice.clientName}</dd>
          </div>
        </dl>
      </div>

      {fieldError("_form") && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{fieldError("_form")}</p>
        </div>
      )}

      {/* Date */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data nota di credito *
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

      {/* Line items */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Righe (modifica o rimuovi per nota parziale)
        </h3>
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
                    {invoice.taxRates.map((rate) => (
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
              <span>Totale nota di credito:</span>
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
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio..." : "Crea Nota di Credito"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/fatture/${invoice.id}`)}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
