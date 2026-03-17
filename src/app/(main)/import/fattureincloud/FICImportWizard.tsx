"use client";

import { useState } from "react";
import {
  detectFICFile,
  importFICData,
  type FICDetectResult,
  type FICImportResult,
  type SerializedFICInvoice,
  type SerializedFICCreditNote,
  type SerializedFICQuote,
} from "./actions";
import { type FICClient } from "@/lib/import/fattureincloud-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Step = "upload" | "detect" | "preview" | "importing" | "result";

const FILE_TYPE_LABELS: Record<string, string> = {
  invoices: "Fatture",
  credit_notes: "Note di Credito",
  quotes: "Preventivi",
  clients: "Clienti",
};

export default function FICImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [detectResult, setDetectResult] = useState<FICDetectResult | null>(null);
  const [importResult, setImportResult] = useState<FICImportResult | null>(null);

  // Data to import (may be filtered by user)
  const [invoices, setInvoices] = useState<SerializedFICInvoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<SerializedFICCreditNote[]>([]);
  const [quotes, setQuotes] = useState<SerializedFICQuote[]>([]);
  const [clients, setClients] = useState<FICClient[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setDetectResult(null);
    setStep("detect");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await detectFICFile(formData);

      if (!result.success) {
        setError(result.parseErrors.join("; "));
        setStep("upload");
        return;
      }

      setDetectResult(result);
      setInvoices(result.invoices);
      setCreditNotes(result.creditNotes);
      setQuotes(result.quotes);
      setClients(result.clients);
      setStep("preview");
    } catch (err) {
      setError("Errore nel parsing del file: " + (err instanceof Error ? err.message : String(err)));
      setStep("upload");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    setError(null);

    try {
      // Filter out duplicates before import
      const filteredInvoices = invoices.filter((inv) => !inv.isDuplicate);
      const filteredCreditNotes = creditNotes.filter((cn) => !cn.isDuplicate);
      const filteredQuotes = quotes.filter((q) => !q.isDuplicate);

      const result = await importFICData(filteredInvoices, filteredCreditNotes, filteredQuotes, clients);
      setImportResult(result);
      setStep("result");
    } catch (err) {
      setError("Errore durante l'importazione: " + (err instanceof Error ? err.message : String(err)));
      setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setError(null);
    setDetectResult(null);
    setImportResult(null);
    setInvoices([]);
    setCreditNotes([]);
    setQuotes([]);
    setClients([]);
  };

  const totalRecords = invoices.length + creditNotes.length + quotes.length + clients.length;
  const duplicateCount =
    invoices.filter((i) => i.isDuplicate).length +
    creditNotes.filter((cn) => cn.isDuplicate).length +
    quotes.filter((q) => q.isDuplicate).length;
  const newRecords = totalRecords - duplicateCount;

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
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="text-gray-500 mb-4">
            <p className="text-lg font-medium">Carica un file esportato da Fatture in Cloud</p>
            <p className="text-sm mt-1">
              Supportati: Fatture_YYYY.xls, NC_YYYY.xls, Preventivi_YYYY.xls, Lista_Clienti.xlsx
            </p>
          </div>
          <Input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileUpload}
            className="mx-auto w-auto"
          />
          <p className="mt-4 text-xs text-gray-400">
            Formati supportati: XLS, XLSX. Il tipo di documento viene rilevato automaticamente dal nome del file e dalle colonne.
          </p>
        </div>
      )}

      {/* Step 2: Detecting (loading) */}
      {step === "detect" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-sm text-gray-600">Analisi del file in corso...</p>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && detectResult && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Tipo rilevato: {FILE_TYPE_LABELS[detectResult.fileType] || detectResult.fileType}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {totalRecords} record trovati, {duplicateCount} duplicati, {newRecords} nuovi da importare
                  </p>
                </div>
                <Badge variant={newRecords > 0 ? "default" : "secondary"}>
                  {newRecords} nuovi
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Parse errors */}
          {detectResult.parseErrors.length > 0 && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription className="text-yellow-700">
                <p className="font-medium">Avvisi di parsing ({detectResult.parseErrors.length}):</p>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {detectResult.parseErrors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {detectResult.parseErrors.length > 10 && (
                    <li>...e altri {detectResult.parseErrors.length - 10} avvisi</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Invoices table */}
          {invoices.length > 0 && (
            <PreviewSection
              title={`Fatture (${invoices.length})`}
              headers={["Numero", "Data", "Cliente", "Imponibile", "IVA", "Totale", "Stato", ""]}
              rows={invoices.map((inv) => ({
                cells: [
                  inv.number,
                  formatDate(inv.date),
                  inv.clientName,
                  formatCurrency(inv.imponibile),
                  formatCurrency(inv.iva),
                  formatCurrency(inv.totale),
                  inv.stato,
                ],
                isDuplicate: inv.isDuplicate,
              }))}
            />
          )}

          {/* Credit notes table */}
          {creditNotes.length > 0 && (
            <PreviewSection
              title={`Note di Credito (${creditNotes.length})`}
              headers={["Numero", "Data", "Cliente", "Imponibile", "IVA", "Totale", ""]}
              rows={creditNotes.map((cn) => ({
                cells: [
                  cn.number,
                  formatDate(cn.date),
                  cn.clientName,
                  formatCurrency(cn.imponibile),
                  formatCurrency(cn.iva),
                  formatCurrency(cn.totale),
                ],
                isDuplicate: cn.isDuplicate,
              }))}
            />
          )}

          {/* Quotes table */}
          {quotes.length > 0 && (
            <PreviewSection
              title={`Preventivi (${quotes.length})`}
              headers={["Numero", "Data", "Cliente", "Imponibile", "IVA", "Totale", "Stato", ""]}
              rows={quotes.map((q) => ({
                cells: [
                  q.number,
                  formatDate(q.date),
                  q.clientName,
                  formatCurrency(q.imponibile),
                  formatCurrency(q.iva),
                  formatCurrency(q.totale),
                  q.stato,
                ],
                isDuplicate: q.isDuplicate,
              }))}
            />
          )}

          {/* Clients table */}
          {clients.length > 0 && (
            <PreviewSection
              title={`Clienti (${clients.length})`}
              headers={["Nome", "P.IVA", "Codice Fiscale", "Città", "Paese", "Email"]}
              rows={clients.map((c) => ({
                cells: [
                  c.name,
                  c.vatNumber,
                  c.fiscalCode,
                  c.city,
                  c.country,
                  c.email,
                ],
                isDuplicate: false,
              }))}
            />
          )}

          {/* Info */}
          <Alert className="border-blue-300 bg-blue-50">
            <AlertDescription className="text-blue-700">
              <p className="font-medium">Riepilogo importazione:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                {invoices.length > 0 && (
                  <li>
                    {invoices.filter((i) => !i.isDuplicate).length} fatture nuove da importare
                    {invoices.some((i) => i.isDuplicate) && (
                      <> ({invoices.filter((i) => i.isDuplicate).length} duplicati saranno saltati)</>
                    )}
                  </li>
                )}
                {creditNotes.length > 0 && (
                  <li>
                    {creditNotes.filter((cn) => !cn.isDuplicate).length} note di credito nuove
                    {creditNotes.some((cn) => cn.isDuplicate) && (
                      <> ({creditNotes.filter((cn) => cn.isDuplicate).length} duplicati saranno saltati)</>
                    )}
                  </li>
                )}
                {quotes.length > 0 && (
                  <li>
                    {quotes.filter((q) => !q.isDuplicate).length} preventivi nuovi
                    {quotes.some((q) => q.isDuplicate) && (
                      <> ({quotes.filter((q) => q.isDuplicate).length} duplicati saranno saltati)</>
                    )}
                  </li>
                )}
                {clients.length > 0 && (
                  <li>{clients.length} clienti (nuovi saranno creati, esistenti aggiornati)</li>
                )}
                <li>I clienti non presenti nel sistema verranno creati automaticamente</li>
                <li>Ogni documento viene importato con una singola riga (importo = imponibile)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              Annulla
            </Button>
            <Button
              onClick={handleImport}
              disabled={newRecords === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Importa ({newRecords} record)
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
                <ImportResultSummary result={importResult} />
              </AlertDescription>
            </Alert>
          ) : importResult.success ? (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription className="text-yellow-700">
                <h3 className="text-lg font-medium">Importazione completata con avvisi</h3>
                <ImportResultSummary result={importResult} />
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                <h3 className="text-lg font-medium">Importazione fallita</h3>
                <ImportResultSummary result={importResult} />
              </AlertDescription>
            </Alert>
          )}

          {/* Error List */}
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
                      <Badge variant="destructive">Errore</Badge>
                      <span className="text-gray-700">{err}</span>
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

// --- Sub-components ---

function ImportResultSummary({ result }: { result: FICImportResult }) {
  return (
    <div className="mt-2 text-sm space-y-1">
      {result.importedInvoices > 0 && (
        <p>Fatture importate: <strong>{result.importedInvoices}</strong></p>
      )}
      {result.importedCreditNotes > 0 && (
        <p>Note di credito importate: <strong>{result.importedCreditNotes}</strong></p>
      )}
      {result.importedQuotes > 0 && (
        <p>Preventivi importati: <strong>{result.importedQuotes}</strong></p>
      )}
      {result.importedClients > 0 && (
        <p>Clienti importati: <strong>{result.importedClients}</strong></p>
      )}
      {result.createdClients > 0 && (
        <p>Clienti creati: <strong>{result.createdClients}</strong></p>
      )}
      {result.skippedDuplicates > 0 && (
        <p>Duplicati saltati: <strong>{result.skippedDuplicates}</strong></p>
      )}
    </div>
  );
}

interface PreviewRow {
  cells: string[];
  isDuplicate: boolean;
}

function PreviewSection({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: PreviewRow[];
}) {
  const previewRows = rows.slice(0, 20);
  const hasMore = rows.length > 20;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {headers.map((h, i) => (
                  <TableHead key={i}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={row.isDuplicate ? "bg-yellow-50 text-gray-400" : ""}
                >
                  <TableCell className="text-gray-400">{idx + 1}</TableCell>
                  {row.cells.map((cell, ci) => (
                    <TableCell key={ci} className="whitespace-nowrap max-w-48 truncate">
                      {cell || <span className="text-gray-300">-</span>}
                    </TableCell>
                  ))}
                  <TableCell>
                    {row.isDuplicate && (
                      <Badge variant="secondary" className="text-xs">
                        Duplicato
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMore && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t">
              Mostrando le prime 20 di {rows.length} righe
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Formatters ---

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("it-IT");
  } catch {
    return isoDate;
  }
}

function formatCurrency(amount: number): string {
  if (amount === 0) return "-";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
