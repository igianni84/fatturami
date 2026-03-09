"use client";

import { useState } from "react";
import type { ExtractionResult } from "@/app/(main)/api/extract/route";
import { importPDFBatch, type ReviewItem, type ReviewLineItem, type ImportPDFResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/FileDropzone";

type Step = "upload" | "processing" | "review" | "importing" | "result";

interface FileProcessingStatus {
  fileName: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  result?: ExtractionResult;
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

export default function PDFBatchImporter() {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [processingStatuses, setProcessingStatuses] = useState<FileProcessingStatus[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<ImportPDFResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    const validFiles = selectedFiles.filter((f) => allowedTypes.includes(f.type));

    if (validFiles.length === 0) {
      setError("Nessun file valido selezionato. Formati supportati: PDF, JPG, PNG, WebP, GIF.");
      return;
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setError(null);
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) return;

    setStep("processing");
    setError(null);

    const statuses: FileProcessingStatus[] = files.map((f) => ({
      fileName: f.name,
      status: "pending" as const,
    }));
    setProcessingStatuses([...statuses]);

    const results: ReviewItem[] = [];

    // Process files sequentially to avoid API rate limits
    for (let i = 0; i < files.length; i++) {
      statuses[i].status = "processing";
      setProcessingStatuses([...statuses]);

      try {
        const formData = new FormData();
        formData.append("file", files[i]);

        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          statuses[i].status = "error";
          statuses[i].error = errData.error || "Errore nell'estrazione";
          setProcessingStatuses([...statuses]);
          continue;
        }

        const extraction: ExtractionResult = await response.json();
        statuses[i].status = "done";
        statuses[i].result = extraction;
        setProcessingStatuses([...statuses]);

        // Convert extraction to review item
        const reviewItem: ReviewItem = {
          fileIndex: i,
          fileName: files[i].name,
          supplierName: extraction.supplierName || "",
          supplierVatNumber: extraction.supplierVatNumber || "",
          invoiceNumber: extraction.invoiceNumber || "",
          date: extraction.date || "",
          category: "altro",
          matchedSupplierId: extraction.matchedSupplierId || "",
          matchedSupplierName: extraction.matchedSupplierName || "",
          lines: extraction.lineItems.map((li) => ({
            description: li.description,
            amount: li.amount,
            taxRate: li.taxRate,
            deductible: true,
          })),
          subtotal: extraction.subtotal || 0,
          taxAmount: extraction.taxAmount || 0,
          total: extraction.total || 0,
        };

        results.push(reviewItem);
      } catch (err) {
        statuses[i].status = "error";
        statuses[i].error = err instanceof Error ? err.message : "Errore sconosciuto";
        setProcessingStatuses([...statuses]);
      }
    }

    setReviewItems(results);
    if (results.length > 0) {
      setStep("review");
    } else {
      setError("Nessun file è stato estratto con successo.");
      setStep("upload");
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveReviewItem = (index: number) => {
    setReviewItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
  };

  const handleUpdateReviewItem = (index: number, field: keyof ReviewItem, value: string) => {
    setReviewItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleUpdateLine = (itemIndex: number, lineIndex: number, field: keyof ReviewLineItem, value: string | number | boolean) => {
    setReviewItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const newLines = [...item.lines];
        newLines[lineIndex] = { ...newLines[lineIndex], [field]: value };
        return { ...item, lines: newLines };
      })
    );
  };

  const handleAddLine = (itemIndex: number) => {
    setReviewItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        return {
          ...item,
          lines: [...item.lines, { description: "", amount: 0, taxRate: 21, deductible: true }],
        };
      })
    );
  };

  const handleRemoveLine = (itemIndex: number, lineIndex: number) => {
    setReviewItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        return { ...item, lines: item.lines.filter((_, li) => li !== lineIndex) };
      })
    );
  };

  const handleConfirmImport = async () => {
    if (reviewItems.length === 0) return;
    setStep("importing");
    setError(null);

    try {
      const result = await importPDFBatch(reviewItems);
      setImportResult(result);
      setStep("result");
    } catch (err) {
      setError("Errore durante l'importazione: " + (err instanceof Error ? err.message : String(err)));
      setStep("review");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setProcessingStatuses([]);
    setReviewItems([]);
    setEditingIndex(null);
    setImportResult(null);
    setError(null);
  };

  const processedCount = processingStatuses.filter((s) => s.status === "done" || s.status === "error").length;
  const progressPercent = processingStatuses.length > 0 ? Math.round((processedCount / processingStatuses.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <FileDropzone
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
            multiple
            onFiles={handleFilesSelected}
          >
            <div className="space-y-2">
              <p className="text-lg font-medium text-muted-foreground">
                Trascina i file qui o clicca per selezionare
              </p>
              <p className="text-sm text-muted-foreground/70">
                PDF, JPG, PNG, WebP, GIF — elaborazione batch con AI
              </p>
            </div>
          </FileDropzone>

          {/* Selected files list */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                File selezionati ({files.length})
              </h3>
              <Card>
                <CardContent className="p-0 divide-y">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-6">{idx + 1}.</span>
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Rimuovi
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Button onClick={handleStartProcessing}>
                Avvia Elaborazione AI
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Processing with progress */}
      {step === "processing" && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Elaborazione in corso...</h3>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progresso: {processedCount} / {processingStatuses.length} file</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* File statuses */}
          <Card>
            <CardContent className="p-0 divide-y">
              {processingStatuses.map((status, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={status.status} />
                    <span className="text-sm text-gray-700">{status.fileName}</span>
                  </div>
                  {status.error && (
                    <span className="text-xs text-red-600">{status.error}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Revisione Dati Estratti
            </h3>
            <span className="text-sm text-gray-500">
              {reviewItems.length} documenti estratti
            </span>
          </div>

          <p className="text-sm text-gray-600">
            Verifica e correggi i dati estratti prima dell&apos;importazione. Clicca su un documento per modificarlo.
          </p>

          {/* Processing errors summary */}
          {processingStatuses.some((s) => s.status === "error") && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription className="text-yellow-700">
                <p className="font-medium">Alcuni file non sono stati elaborati:</p>
                <ul className="mt-1 list-disc pl-5">
                  {processingStatuses
                    .filter((s) => s.status === "error")
                    .map((s, idx) => (
                      <li key={idx}>{s.fileName}: {s.error}</li>
                    ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Review items list */}
          <div className="space-y-3">
            {reviewItems.map((item, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Item header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 font-mono">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.matchedSupplierName || item.supplierName || "Fornitore sconosciuto"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.fileName} · {item.invoiceNumber || "N. non rilevato"} · {item.date || "Data non rilevata"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        {item.total ? `€ ${item.total.toFixed(2)}` : "-"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveReviewItem(idx);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Rimuovi
                      </Button>
                      <span className="text-gray-400">{editingIndex === idx ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded edit form */}
                  {editingIndex === idx && (
                    <div className="p-4 space-y-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs mb-1">Fornitore</Label>
                          <Input
                            type="text"
                            value={item.matchedSupplierName || item.supplierName}
                            onChange={(e) => {
                              handleUpdateReviewItem(idx, "supplierName", e.target.value);
                              handleUpdateReviewItem(idx, "matchedSupplierId", "");
                              handleUpdateReviewItem(idx, "matchedSupplierName", "");
                            }}
                          />
                          {item.matchedSupplierId && (
                            <p className="mt-1 text-xs text-green-600">Fornitore esistente riconosciuto</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs mb-1">P.IVA/VAT</Label>
                          <Input
                            type="text"
                            value={item.supplierVatNumber}
                            onChange={(e) => handleUpdateReviewItem(idx, "supplierVatNumber", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1">Numero Fattura</Label>
                          <Input
                            type="text"
                            value={item.invoiceNumber}
                            onChange={(e) => handleUpdateReviewItem(idx, "invoiceNumber", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1">Data</Label>
                          <Input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleUpdateReviewItem(idx, "date", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1">Categoria</Label>
                          <Select
                            value={item.category}
                            onValueChange={(value) => handleUpdateReviewItem(idx, "category", value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Line items */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs">Righe</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddLine(idx)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            + Aggiungi riga
                          </Button>
                        </div>
                        {item.lines.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Nessuna riga estratta. Verrà creata una riga dal totale.</p>
                        ) : (
                          <div className="space-y-2">
                            {item.lines.map((line, li) => (
                              <div key={li} className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) => handleUpdateLine(idx, li, "description", e.target.value)}
                                  placeholder="Descrizione"
                                  className="flex-1 text-xs"
                                />
                                <Input
                                  type="number"
                                  value={line.amount}
                                  onChange={(e) => handleUpdateLine(idx, li, "amount", parseFloat(e.target.value) || 0)}
                                  placeholder="Importo"
                                  step="0.01"
                                  className="w-24 text-xs"
                                />
                                <Input
                                  type="number"
                                  value={line.taxRate}
                                  onChange={(e) => handleUpdateLine(idx, li, "taxRate", parseFloat(e.target.value) || 0)}
                                  placeholder="IVA %"
                                  step="0.5"
                                  className="w-16 text-xs"
                                />
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <Checkbox
                                    checked={line.deductible}
                                    onCheckedChange={(checked) => handleUpdateLine(idx, li, "deductible", !!checked)}
                                  />
                                  <Label className="text-xs text-gray-600">Ded.</Label>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveLine(idx, li)}
                                  className="text-red-400 hover:text-red-600 text-xs px-1"
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Totals */}
                      <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t">
                        <span>Imponibile: € {item.subtotal.toFixed(2)}</span>
                        <span>IVA: € {item.taxAmount.toFixed(2)}</span>
                        <span className="font-medium text-gray-700">Totale: € {item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              Annulla
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={reviewItems.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Conferma Importazione ({reviewItems.length} documenti)
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-sm text-gray-600">Importazione in corso...</p>
        </div>
      )}

      {/* Step 5: Result */}
      {step === "result" && importResult && (
        <div className="space-y-4">
          {importResult.success && importResult.errors.length === 0 ? (
            <Alert>
              <AlertDescription>
                <h3 className="text-lg font-medium">Importazione completata</h3>
                <div className="mt-2 text-sm">
                  <p>
                    Fatture acquisto importate: <strong>{importResult.importedCount}</strong>
                  </p>
                  {importResult.createdSuppliers > 0 && (
                    <p>
                      Fornitori creati: <strong>{importResult.createdSuppliers}</strong>
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : importResult.success ? (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription className="text-yellow-700">
                <h3 className="text-lg font-medium">Importazione completata con avvisi</h3>
                <div className="mt-2 text-sm">
                  <p>
                    Fatture acquisto importate: <strong>{importResult.importedCount}</strong>
                  </p>
                  {importResult.createdSuppliers > 0 && (
                    <p>
                      Fornitori creati: <strong>{importResult.createdSuppliers}</strong>
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                <h3 className="text-lg font-medium">Importazione fallita</h3>
                <div className="mt-2 text-sm">
                  <p>
                    Fatture acquisto importate: <strong>{importResult.importedCount}</strong>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="text-sm font-medium text-gray-700">
                    {importResult.success ? "Avvisi" : "Errori"} ({importResult.errors.length})
                  </h4>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <Badge variant="destructive">
                        {err.fileName}
                      </Badge>
                      <span className="text-gray-700">{err.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleReset}>
            Nuova Importazione
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: FileProcessingStatus["status"] }) {
  switch (status) {
    case "pending":
      return <span className="inline-block w-4 h-4 rounded-full bg-gray-300"></span>;
    case "processing":
      return <span className="inline-block w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></span>;
    case "done":
      return <span className="inline-block w-4 h-4 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">✓</span>;
    case "error":
      return <span className="inline-block w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</span>;
  }
}
