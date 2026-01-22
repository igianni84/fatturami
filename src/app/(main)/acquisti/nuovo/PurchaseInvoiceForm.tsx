"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SupplierOption,
  TaxRateOption,
  PurchaseInvoiceFormData,
  createPurchaseInvoice,
} from "../actions";
import type { ExtractionResult } from "@/app/(main)/api/extract/route";

interface LineItem {
  description: string;
  amount: number;
  taxRateId: string;
  deductible: boolean;
}

function emptyLine(defaultTaxRateId: string): LineItem {
  return {
    description: "",
    amount: 0,
    taxRateId: defaultTaxRateId,
    deductible: true,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  servizi_professionali: "Servizi professionali",
  software: "Software",
  hardware: "Hardware",
  viaggi: "Viaggi",
  telecomunicazioni: "Telecomunicazioni",
  trasporti: "Trasporti",
  pasti: "Pasti",
  materiale_ufficio: "Materiale ufficio",
  altro: "Altro",
};

export default function PurchaseInvoiceForm({
  suppliers,
  taxRates,
}: {
  suppliers: SupplierOption[];
  taxRates: TaxRateOption[];
}) {
  const router = useRouter();
  const defaultTaxRateId = taxRates.length > 0 ? taxRates[0].id : "";

  const [supplierId, setSupplierId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine(defaultTaxRateId)]);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [unmatchedSupplier, setUnmatchedSupplier] = useState<string | null>(null);

  // Handle file upload with AI extraction
  async function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setUnmatchedSupplier(null);
    if (!selectedFile) return;

    setExtracting(true);
    setExtractionMessage(null);
    setAutoFilledFields(new Set());

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        setExtractionMessage(`Estrazione fallita: ${err.error || "Errore sconosciuto"}`);
        setExtracting(false);
        return;
      }

      const result: ExtractionResult = await response.json();
      const filled = new Set<string>();

      // Auto-select matched supplier
      if (result.matchedSupplierId) {
        setSupplierId(result.matchedSupplierId);
        const matched = suppliers.find((s) => s.id === result.matchedSupplierId);
        if (matched?.expenseCategory) {
          setCategory(matched.expenseCategory);
          filled.add("category");
        }
        filled.add("supplierId");
        setUnmatchedSupplier(null);
      } else if (result.supplierName) {
        setUnmatchedSupplier(result.supplierName);
      }

      // Auto-fill invoice number
      if (result.invoiceNumber) {
        setNumber(result.invoiceNumber);
        filled.add("number");
      }

      // Auto-fill date
      if (result.date) {
        setDate(result.date);
        filled.add("date");
      }

      // Auto-fill line items
      if (result.lineItems && result.lineItems.length > 0) {
        const newLines: LineItem[] = result.lineItems.map((item) => {
          // Try to match tax rate
          const matchedRate = taxRates.find(
            (r) => Math.abs(r.rate - item.taxRate) < 0.5
          );
          return {
            description: item.description || "",
            amount: item.amount || 0,
            taxRateId: matchedRate?.id || defaultTaxRateId,
            deductible: true,
          };
        });
        setLines(newLines);
        filled.add("lines");
      }

      setAutoFilledFields(filled);
      setExtractionMessage(
        filled.size > 0
          ? `Dati estratti automaticamente (${filled.size} campi compilati)`
          : "Nessun dato estratto dal documento"
      );
    } catch {
      setExtractionMessage("Errore durante l'estrazione AI");
    } finally {
      setExtracting(false);
    }
  }

  // Auto-set category when supplier changes
  function handleSupplierChange(id: string) {
    setSupplierId(id);
    const supplier = suppliers.find((s) => s.id === id);
    if (supplier && supplier.expenseCategory) {
      setCategory(supplier.expenseCategory);
    }
  }

  function updateLine(index: number, field: keyof LineItem, value: string | number | boolean) {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(defaultTaxRateId)]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  // Calculate totals
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const taxTotal = lines.reduce((sum, line) => {
    const rate = taxRates.find((r) => r.id === line.taxRateId);
    return sum + (line.amount * (rate?.rate || 0)) / 100;
  }, 0);
  const total = subtotal + taxTotal;

  function fieldHighlight(fieldName: string) {
    return autoFilledFields.has(fieldName)
      ? "ring-2 ring-blue-300 bg-blue-50"
      : "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const formData: PurchaseInvoiceFormData = {
      supplierId,
      number,
      date,
      category,
      notes,
      lines: lines.map((line) => ({
        description: line.description,
        amount: line.amount,
        taxRateId: line.taxRateId,
        deductible: line.deductible,
      })),
    };

    const result = await createPurchaseInvoice(formData, file);

    if (result.success) {
      router.push("/acquisti");
    } else {
      setErrors(result.errors || {});
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fornitore *
          </label>
          <select
            value={supplierId}
            onChange={(e) => handleSupplierChange(e.target.value)}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 ${fieldHighlight("supplierId")}`}
          >
            <option value="">Seleziona fornitore</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.supplierId && (
            <p className="text-red-600 text-sm mt-1">{errors.supplierId[0]}</p>
          )}
        </div>

        {/* Invoice number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numero fattura fornitore *
          </label>
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 ${fieldHighlight("number")}`}
            placeholder="Es. FAT-2024-001"
          />
          {errors.number && (
            <p className="text-red-600 text-sm mt-1">{errors.number[0]}</p>
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
            className={`w-full border border-gray-300 rounded-md px-3 py-2 ${fieldHighlight("date")}`}
          />
          {errors.date && (
            <p className="text-red-600 text-sm mt-1">{errors.date[0]}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria spesa *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 ${fieldHighlight("category")}`}
          >
            <option value="">Seleziona categoria</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-red-600 text-sm mt-1">{errors.category[0]}</p>
          )}
        </div>
      </div>

      {/* File upload with AI extraction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allegato (PDF/immagine)
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          disabled={extracting}
        />
        {file && (
          <p className="text-sm text-gray-500 mt-1">
            File selezionato: {file.name}
          </p>
        )}
        {extracting && (
          <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            Estrazione dati in corso...
          </p>
        )}
        {extractionMessage && !extracting && (
          <p className={`text-sm mt-1 ${autoFilledFields.size > 0 ? "text-green-600" : "text-amber-600"}`}>
            {extractionMessage}
          </p>
        )}
        {unmatchedSupplier && (
          <p className="text-sm text-amber-600 mt-1">
            Fornitore rilevato: &quot;{unmatchedSupplier}&quot; (non trovato in anagrafica -{" "}
            <a href="/anagrafiche/fornitori/nuovo" className="underline text-blue-600">
              crea nuovo fornitore
            </a>
            )
          </p>
        )}
      </div>

      {/* Line items */}
      <div className={autoFilledFields.has("lines") ? "ring-2 ring-blue-300 rounded-md p-2" : ""}>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Righe
          {autoFilledFields.has("lines") && (
            <span className="ml-2 text-xs font-normal text-blue-600">(compilate da AI)</span>
          )}
        </h3>
        {errors.lines && (
          <p className="text-red-600 text-sm mb-2">{errors.lines[0]}</p>
        )}

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded-md"
            >
              {/* Description */}
              <div className="col-span-4">
                <label className="block text-xs text-gray-500 mb-1">
                  Descrizione
                </label>
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, "description", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  placeholder="Descrizione"
                />
              </div>

              {/* Amount */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Importo
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.amount || ""}
                  onChange={(e) =>
                    updateLine(index, "amount", parseFloat(e.target.value) || 0)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  placeholder="0.00"
                />
              </div>

              {/* Tax rate */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Aliquota IVA
                </label>
                <select
                  value={line.taxRateId}
                  onChange={(e) =>
                    updateLine(index, "taxRateId", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  {taxRates.map((rate) => (
                    <option key={rate.id} value={rate.id}>
                      {rate.name} ({rate.rate}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Deductible */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Deducibile
                </label>
                <label className="flex items-center gap-1 mt-1">
                  <input
                    type="checkbox"
                    checked={line.deductible}
                    onChange={(e) =>
                      updateLine(index, "deductible", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Sì</span>
                </label>
              </div>

              {/* Tax amount display + remove */}
              <div className="col-span-2 flex items-end gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    IVA
                  </label>
                  <span className="text-sm">
                    {(
                      (line.amount *
                        (taxRates.find((r) => r.id === line.taxRateId)?.rate ||
                          0)) /
                      100
                    ).toFixed(2)}
                  </span>
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="text-red-600 hover:text-red-800 text-sm pb-0.5"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          + Aggiungi riga
        </button>
      </div>

      {/* Totals */}
      <div className="bg-gray-100 p-4 rounded-md">
        <div className="flex justify-between text-sm mb-1">
          <span>Imponibile:</span>
          <span>{subtotal.toFixed(2)} &euro;</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span>IVA:</span>
          <span>{taxTotal.toFixed(2)} &euro;</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
          <span>Totale:</span>
          <span>{total.toFixed(2)} &euro;</span>
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
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="Note aggiuntive..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? "Salvataggio..." : "Registra fattura"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/acquisti")}
          className="border border-gray-300 px-6 py-2 rounded-md hover:bg-gray-50"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
