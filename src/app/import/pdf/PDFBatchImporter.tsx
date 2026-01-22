"use client";

import { useState, useRef } from "react";
import type { ExtractionResult } from "@/app/api/extract/route";
import { importPDFBatch, type ReviewItem, type ReviewLineItem, type ImportPDFResult } from "./actions";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const validFiles: File[] = [];
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (allowedTypes.includes(file.type)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setError("Nessun file valido selezionato. Formati supportati: PDF, JPG, PNG, WebP, GIF.");
      return;
    }

    setFiles(validFiles);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processedCount = processingStatuses.filter((s) => s.status === "done" || s.status === "error").length;
  const progressPercent = processingStatuses.length > 0 ? Math.round((processedCount / processingStatuses.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-gray-500 mb-4">
              <p className="text-lg font-medium">Carica file PDF o immagini</p>
              <p className="text-sm mt-1">
                Seleziona più file per l&apos;elaborazione batch con AI
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
              multiple
              onChange={handleFileSelect}
              className="mx-auto block text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-4 text-xs text-gray-400">
              Formati supportati: PDF, JPG, PNG, WebP, GIF. I file vengono elaborati sequenzialmente.
            </p>
          </div>

          {/* Selected files list */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                File selezionati ({files.length})
              </h3>
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6">{idx + 1}.</span>
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleStartProcessing}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Avvia Elaborazione AI
              </button>
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
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
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
          </div>
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
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
              <p className="font-medium">Alcuni file non sono stati elaborati:</p>
              <ul className="mt-1 list-disc pl-5">
                {processingStatuses
                  .filter((s) => s.status === "error")
                  .map((s, idx) => (
                    <li key={idx}>{s.fileName}: {s.error}</li>
                  ))}
              </ul>
            </div>
          )}

          {/* Review items list */}
          <div className="space-y-3">
            {reviewItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 overflow-hidden">
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveReviewItem(idx);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Rimuovi
                    </button>
                    <span className="text-gray-400">{editingIndex === idx ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded edit form */}
                {editingIndex === idx && (
                  <div className="p-4 space-y-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fornitore</label>
                        <input
                          type="text"
                          value={item.matchedSupplierName || item.supplierName}
                          onChange={(e) => {
                            handleUpdateReviewItem(idx, "supplierName", e.target.value);
                            handleUpdateReviewItem(idx, "matchedSupplierId", "");
                            handleUpdateReviewItem(idx, "matchedSupplierName", "");
                          }}
                          className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {item.matchedSupplierId && (
                          <p className="mt-1 text-xs text-green-600">Fornitore esistente riconosciuto</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">P.IVA/VAT</label>
                        <input
                          type="text"
                          value={item.supplierVatNumber}
                          onChange={(e) => handleUpdateReviewItem(idx, "supplierVatNumber", e.target.value)}
                          className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Numero Fattura</label>
                        <input
                          type="text"
                          value={item.invoiceNumber}
                          onChange={(e) => handleUpdateReviewItem(idx, "invoiceNumber", e.target.value)}
                          className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => handleUpdateReviewItem(idx, "date", e.target.value)}
                          className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdateReviewItem(idx, "category", e.target.value)}
                          className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Line items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-600">Righe</label>
                        <button
                          onClick={() => handleAddLine(idx)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          + Aggiungi riga
                        </button>
                      </div>
                      {item.lines.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessuna riga estratta. Verrà creata una riga dal totale.</p>
                      ) : (
                        <div className="space-y-2">
                          {item.lines.map((line, li) => (
                            <div key={li} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleUpdateLine(idx, li, "description", e.target.value)}
                                placeholder="Descrizione"
                                className="flex-1 rounded-md border-gray-300 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                value={line.amount}
                                onChange={(e) => handleUpdateLine(idx, li, "amount", parseFloat(e.target.value) || 0)}
                                placeholder="Importo"
                                step="0.01"
                                className="w-24 rounded-md border-gray-300 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                value={line.taxRate}
                                onChange={(e) => handleUpdateLine(idx, li, "taxRate", parseFloat(e.target.value) || 0)}
                                placeholder="IVA %"
                                step="0.5"
                                className="w-16 rounded-md border-gray-300 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                              <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={line.deductible}
                                  onChange={(e) => handleUpdateLine(idx, li, "deductible", e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                                Ded.
                              </label>
                              <button
                                onClick={() => handleRemoveLine(idx, li)}
                                className="text-red-400 hover:text-red-600 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Totals */}
                    <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <span>Imponibile: € {item.subtotal.toFixed(2)}</span>
                      <span>IVA: € {item.taxAmount.toFixed(2)}</span>
                      <span className="font-medium text-gray-700">Totale: € {item.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={reviewItems.length === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Conferma Importazione ({reviewItems.length} documenti)
            </button>
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
          <div
            className={`rounded-md p-4 ${
              importResult.success && importResult.errors.length === 0
                ? "bg-green-50 border border-green-200"
                : importResult.success
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-red-50 border border-red-200"
            }`}
          >
            <h3
              className={`text-lg font-medium ${
                importResult.success && importResult.errors.length === 0
                  ? "text-green-800"
                  : importResult.success
                    ? "text-yellow-800"
                    : "text-red-800"
              }`}
            >
              {importResult.success
                ? importResult.errors.length === 0
                  ? "Importazione completata"
                  : "Importazione completata con avvisi"
                : "Importazione fallita"}
            </h3>
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
          </div>

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <div className="rounded-lg border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">
                  {importResult.success ? "Avvisi" : "Errori"} ({importResult.errors.length})
                </h4>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {importResult.errors.map((err, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {err.fileName}
                    </span>
                    <span className="text-gray-700">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Nuova Importazione
          </button>
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
