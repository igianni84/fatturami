"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseFormData, createExpense } from "../actions";

const CATEGORY_LABELS: Record<string, string> = {
  trasporti: "Trasporti",
  pasti: "Pasti",
  materiale_ufficio: "Materiale ufficio",
  telecomunicazioni: "Telecomunicazioni",
  altro: "Altro",
};

export default function ExpenseForm() {
  const router = useRouter();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState("");
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [deductible, setDeductible] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const formData: ExpenseFormData = {
      date,
      description,
      amount,
      category,
      taxAmount,
      deductible,
    };

    const result = await createExpense(formData, file);

    if (result.success) {
      router.push("/spese");
    } else {
      setErrors(result.errors || {});
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Date and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          {errors.date && (
            <p className="text-red-600 text-sm mt-1">{errors.date[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
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

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrizione *
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="Descrizione della spesa"
        />
        {errors.description && (
          <p className="text-red-600 text-sm mt-1">{errors.description[0]}</p>
        )}
      </div>

      {/* Amount and Tax */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Importo *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount || ""}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-red-600 text-sm mt-1">{errors.amount[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Importo IVA
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={taxAmount || ""}
            onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="0.00"
          />
          {errors.taxAmount && (
            <p className="text-red-600 text-sm mt-1">{errors.taxAmount[0]}</p>
          )}
        </div>
      </div>

      {/* Deductible flag */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={deductible}
            onChange={(e) => setDeductible(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Deducibile
          </span>
        </label>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allegato (PDF/immagine)
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
        {file && (
          <p className="text-sm text-gray-500 mt-1">
            File selezionato: {file.name}
          </p>
        )}
      </div>

      {/* Totals summary */}
      <div className="bg-gray-100 p-4 rounded-md">
        <div className="flex justify-between text-sm mb-1">
          <span>Importo netto:</span>
          <span>{amount.toFixed(2)} &euro;</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span>IVA:</span>
          <span>{taxAmount.toFixed(2)} &euro;</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
          <span>Totale:</span>
          <span>{(amount + taxAmount).toFixed(2)} &euro;</span>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? "Salvataggio..." : "Registra spesa"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/spese")}
          className="border border-gray-300 px-6 py-2 rounded-md hover:bg-gray-50"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
