"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/lib/hooks/useUnsavedChanges";
import { toast } from "sonner";
import {
  SupplierOption,
  TaxRateOption,
  PurchaseInvoiceFormData,
  createPurchaseInvoice,
} from "../actions";
import type { ExtractionResult } from "@/app/(main)/api/extract/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/FileDropzone";

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
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty && !saving);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [unmatchedSupplier, setUnmatchedSupplier] = useState<string | null>(null);

  // Handle file upload with AI extraction
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  async function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setUnmatchedSupplier(null);
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
    const line = lines[index];
    if (line.description || line.amount > 0) {
      if (!window.confirm("Sei sicuro di voler rimuovere questa riga?")) return;
    }
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
    <form onSubmit={handleSubmit} onChange={() => { if (!isDirty) setIsDirty(true); }} className="max-w-4xl space-y-6">
      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier */}
        <div>
          <Label className="mb-1">Fornitore *</Label>
          <Select
            value={supplierId || undefined}
            onValueChange={(value) => handleSupplierChange(value)}
          >
            <SelectTrigger className={fieldHighlight("supplierId")}>
              <SelectValue placeholder="Seleziona fornitore" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.supplierId && (
            <p className="text-sm text-destructive mt-1">{errors.supplierId[0]}</p>
          )}
        </div>

        {/* Invoice number */}
        <div>
          <Label className="mb-1">Numero fattura fornitore *</Label>
          <Input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={fieldHighlight("number")}
            placeholder="Es. FAT-2024-001"
          />
          {errors.number && (
            <p className="text-sm text-destructive mt-1">{errors.number[0]}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <Label className="mb-1">Data *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldHighlight("date")}
          />
          {errors.date && (
            <p className="text-sm text-destructive mt-1">{errors.date[0]}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <Label className="mb-1">Categoria spesa *</Label>
          <Select
            value={category || undefined}
            onValueChange={(value) => setCategory(value)}
          >
            <SelectTrigger className={fieldHighlight("category")}>
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

      {/* File upload with AI extraction */}
      <div>
        <Label className="mb-1">Allegato (PDF/immagine)</Label>
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
        {extractionMessage && !extracting && (
          <p className={`text-sm mt-2 ${autoFilledFields.size > 0 ? "text-green-600" : "text-amber-600"}`}>
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
          <p className="text-sm text-destructive mb-2">{errors.lines[0]}</p>
        )}

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded-md"
            >
              {/* Description */}
              <div className="col-span-4">
                <Label className="text-xs text-gray-500 mb-1">
                  Descrizione
                </Label>
                <Input
                  type="text"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, "description", e.target.value)
                  }
                  className="text-sm"
                  placeholder="Descrizione"
                />
              </div>

              {/* Amount */}
              <div className="col-span-2">
                <Label className="text-xs text-gray-500 mb-1">
                  Importo
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.amount || ""}
                  onChange={(e) =>
                    updateLine(index, "amount", parseFloat(e.target.value) || 0)
                  }
                  className="text-sm"
                  placeholder="0.00"
                />
              </div>

              {/* Tax rate */}
              <div className="col-span-2">
                <Label className="text-xs text-gray-500 mb-1">
                  Aliquota IVA
                </Label>
                <Select
                  value={line.taxRateId || undefined}
                  onValueChange={(value) =>
                    updateLine(index, "taxRateId", value)
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="IVA" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.name} ({rate.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deductible */}
              <div className="col-span-2">
                <Label className="text-xs text-gray-500 mb-1">
                  Deducibile
                </Label>
                <div className="flex items-center gap-1 mt-1">
                  <Checkbox
                    checked={line.deductible}
                    onCheckedChange={(checked) =>
                      updateLine(index, "deductible", checked === true)
                    }
                  />
                  <span className="text-sm">Si</span>
                </div>
              </div>

              {/* Tax amount display + remove */}
              <div className="col-span-2 flex items-end gap-2">
                <div>
                  <Label className="text-xs text-gray-500 mb-1">
                    IVA
                  </Label>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeLine(index)}
                  >
                    Rimuovi
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addLine}
          className="mt-3"
        >
          + Aggiungi riga
        </Button>
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
        <Label className="mb-1">Note</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Note aggiuntive..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvataggio..." : "Salva Acquisto"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/acquisti")}
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
