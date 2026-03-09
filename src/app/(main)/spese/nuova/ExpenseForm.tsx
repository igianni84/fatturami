"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/lib/hooks/useUnsavedChanges";
import { toast } from "sonner";
import { ExpenseFormData, createExpense } from "../actions";
import type { ExtractionResult } from "@/app/(main)/api/extract/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/FileDropzone";

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
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty && !saving);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  async function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("Il file supera il limite di 10MB");
      setFile(null);
      return;
    }

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

      // Auto-fill date
      if (result.date) {
        setDate(result.date);
        filled.add("date");
      }

      // Auto-fill description from supplier name or first line item
      if (result.supplierName) {
        setDescription(result.supplierName);
        filled.add("description");
      } else if (result.lineItems.length > 0 && result.lineItems[0].description) {
        setDescription(result.lineItems[0].description);
        filled.add("description");
      }

      // Auto-fill amount (subtotal or sum of line items)
      if (result.subtotal != null && result.subtotal > 0) {
        setAmount(result.subtotal);
        filled.add("amount");
      } else if (result.total != null && result.total > 0 && result.taxAmount != null) {
        setAmount(result.total - result.taxAmount);
        filled.add("amount");
      }

      // Auto-fill tax amount
      if (result.taxAmount != null && result.taxAmount > 0) {
        setTaxAmount(result.taxAmount);
        filled.add("taxAmount");
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

  function fieldHighlight(fieldName: string) {
    return autoFilledFields.has(fieldName)
      ? "ring-2 ring-blue-300 bg-blue-50"
      : "";
  }

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
    <form onSubmit={handleSubmit} onChange={() => { if (!isDirty) setIsDirty(true); }} className="max-w-2xl space-y-6">
      {/* Date and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`mt-1 ${fieldHighlight("date")}`}
          />
          {errors.date && (
            <p className="text-sm text-destructive mt-1">{errors.date[0]}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category">Categoria *</Label>
          <Select
            value={category || undefined}
            onValueChange={(value) => setCategory(value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleziona categoria" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive mt-1">{errors.category[0]}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Descrizione *</Label>
        <Input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`mt-1 ${fieldHighlight("description")}`}
          placeholder="Descrizione della spesa"
        />
        {errors.description && (
          <p className="text-sm text-destructive mt-1">{errors.description[0]}</p>
        )}
      </div>

      {/* Amount and Tax */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Importo *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount || ""}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={`mt-1 ${fieldHighlight("amount")}`}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-destructive mt-1">{errors.amount[0]}</p>
          )}
        </div>

        <div>
          <Label htmlFor="taxAmount">Importo IVA</Label>
          <Input
            id="taxAmount"
            type="number"
            step="0.01"
            min="0"
            value={taxAmount || ""}
            onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
            className={`mt-1 ${fieldHighlight("taxAmount")}`}
            placeholder="0.00"
          />
          {errors.taxAmount && (
            <p className="text-sm text-destructive mt-1">{errors.taxAmount[0]}</p>
          )}
        </div>
      </div>

      {/* Deductible flag */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="deductible"
          checked={deductible}
          onCheckedChange={(checked) => setDeductible(checked === true)}
        />
        <Label htmlFor="deductible">Deducibile</Label>
      </div>

      {/* File upload with AI extraction */}
      <div>
        <Label>Allegato (PDF/immagine)</Label>
        <div className="mt-1">
          <FileDropzone
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={extracting}
            onFiles={(files) => handleFileChange(files[0] || null)}
          >
            <div className="space-y-1">
              {extracting ? (
                <p className="text-sm text-blue-600 flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  Estrazione dati in corso...
                </p>
              ) : file ? (
                <p className="text-sm text-muted-foreground">
                  File selezionato: <span className="font-medium">{file.name}</span>
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    Trascina un file qui o clicca per selezionare
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Formati: PDF, JPG, PNG (max 10MB)
                  </p>
                </>
              )}
            </div>
          </FileDropzone>
        </div>
        {extractionMessage && !extracting && (
          <p className={`text-sm mt-2 ${autoFilledFields.size > 0 ? "text-green-600" : "text-amber-600"}`}>
            {extractionMessage}
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
        <Button type="submit" disabled={saving}>
          {saving ? "Salvataggio..." : "Salva Spesa"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/spese")}
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
