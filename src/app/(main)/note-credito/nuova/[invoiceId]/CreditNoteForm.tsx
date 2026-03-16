"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/lib/hooks/useUnsavedChanges";
import {
  InvoiceForCreditNote,
  CreditNoteFormData,
  createCreditNote,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAmount } from "@/lib/formatting";

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
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty && !saving);
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
    const line = lines[index];
    if (line.description || line.unitPrice > 0) {
      if (!window.confirm("Sei sicuro di voler rimuovere questa riga?")) return;
    }
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

  const currencySymbol =
    invoice.currency === "EUR"
      ? "€"
      : invoice.currency === "GBP"
        ? "£"
        : "$";

  return (
    <form onSubmit={handleSubmit} onChange={() => { if (!isDirty) setIsDirty(true); }} className="max-w-4xl space-y-6">
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
        <Alert variant="destructive">
          <AlertDescription>{fieldError("_form")}</AlertDescription>
        </Alert>
      )}

      {/* Date */}
      <div className="max-w-xs">
        <Label className="mb-1">Data nota di credito *</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {fieldError("date") && (
          <p className="text-sm text-destructive mt-1">{fieldError("date")}</p>
        )}
      </div>

      {/* Line items */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Righe (modifica o rimuovi per nota parziale)
        </h3>
        {fieldError("lines") && (
          <p className="text-sm text-destructive mb-2">{fieldError("lines")}</p>
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
                  <Label className="text-xs text-gray-600 mb-1">
                    Descrizione
                  </Label>
                  <Input
                    type="text"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    className="text-sm"
                  />
                </div>

                {/* Quantity */}
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-600 mb-1">
                    Quantita
                  </Label>
                  <Input
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
                    className="text-sm"
                  />
                </div>

                {/* Unit Price */}
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-600 mb-1">
                    Prezzo unit.
                  </Label>
                  <Input
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
                    className="text-sm"
                  />
                </div>

                {/* Tax Rate */}
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-600 mb-1">
                    Aliquota IVA
                  </Label>
                  <Select
                    value={line.taxRateId || undefined}
                    onValueChange={(value) =>
                      updateLine(index, "taxRateId", value)
                    }
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Seleziona aliquota..." />
                    </SelectTrigger>
                    <SelectContent>
                      {invoice.taxRates.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} ({rate.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Line total + remove */}
                <div className="md:col-span-2 flex items-end gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {currencySymbol} {formatAmount(lineTotal(line))}
                  </span>
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
                {currencySymbol} {formatAmount(totalSubtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IVA:</span>
              <span>
                {currencySymbol} {formatAmount(totalTax)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-1">
              <span>Totale nota di credito:</span>
              <span>
                {currencySymbol} {formatAmount(totalAmount)}
              </span>
            </div>
          </div>
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvataggio..." : "Salva Nota di Credito"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/fatture/${invoice.id}`)}
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
