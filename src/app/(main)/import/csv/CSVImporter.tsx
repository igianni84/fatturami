"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import {
  importCSV,
  ISSUED_FIELDS,
  RECEIVED_FIELDS,
  type ImportType,
  type FieldMapping,
  type ImportResult,
  type ValidationError,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ParsedRow = Record<string, string>;

type Step = "upload" | "mapping" | "preview" | "importing" | "result";

export default function CSVImporter() {
  const [importType, setImportType] = useState<ImportType>("issued");
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = importType === "issued" ? ISSUED_FIELDS : RECEIVED_FIELDS;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError("Errore nel parsing del file CSV: " + results.errors[0].message);
          return;
        }

        if (results.data.length === 0) {
          setError("Il file CSV è vuoto o non contiene dati validi.");
          return;
        }

        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvRows(results.data);

        // Auto-map fields by matching header names
        const autoMapping: FieldMapping = {};
        for (const field of importType === "issued" ? ISSUED_FIELDS : RECEIVED_FIELDS) {
          const match = headers.find(
            (h) =>
              h.toLowerCase().trim() === field.label.toLowerCase() ||
              h.toLowerCase().trim() === field.key.toLowerCase() ||
              h.toLowerCase().replace(/[_\s]/g, "") === field.key.toLowerCase().replace(/[_\s]/g, "")
          );
          if (match) {
            autoMapping[field.key] = match;
          }
        }
        setMapping(autoMapping);
        setStep("mapping");
      },
      error: (err) => {
        setError("Errore nel parsing del file: " + err.message);
      },
    });
  }, [importType]);

  const handleMappingChange = (fieldKey: string, csvColumn: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (csvColumn === "__unmapped__") {
        delete next[fieldKey];
      } else {
        next[fieldKey] = csvColumn;
      }
      return next;
    });
  };

  const validateMapping = (): string[] => {
    const missingRequired: string[] = [];
    for (const field of fields) {
      if (field.required && !mapping[field.key]) {
        missingRequired.push(field.label);
      }
    }
    return missingRequired;
  };

  const handleProceedToPreview = () => {
    const missing = validateMapping();
    if (missing.length > 0) {
      setError(`Campi obbligatori non mappati: ${missing.join(", ")}`);
      return;
    }
    setError(null);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    setError(null);

    try {
      const importResult = await importCSV(csvRows, mapping, importType);
      setResult(importResult);
      setStep("result");
    } catch (err) {
      setError("Errore durante l'importazione: " + (err instanceof Error ? err.message : String(err)));
      setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setResult(null);
    setError(null);
  };

  const previewRows = csvRows.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Import Type Toggle */}
      <Card>
        <CardContent className="flex gap-4 items-center py-4">
          <Label className="text-sm font-medium">Tipo di importazione:</Label>
          <div className="flex gap-2">
            <Button
              variant={importType === "issued" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setImportType("issued");
                if (step !== "upload") handleReset();
              }}
            >
              Fatture Emesse
            </Button>
            <Button
              variant={importType === "received" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setImportType("received");
                if (step !== "upload") handleReset();
              }}
            >
              Fatture Ricevute
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: File Upload */}
      {step === "upload" && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="text-gray-500 mb-4">
            <p className="text-lg font-medium">Carica un file CSV</p>
            <p className="text-sm mt-1">
              {importType === "issued"
                ? "Importa fatture emesse ai clienti"
                : "Importa fatture ricevute dai fornitori"}
            </p>
          </div>
          <Input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="mx-auto w-auto"
          />
          <p className="mt-4 text-xs text-gray-400">
            Formato supportato: CSV con intestazione. Separatori: virgola, punto e virgola, tab.
          </p>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Mappatura Colonne</h3>
            <span className="text-sm text-gray-500">
              {csvRows.length} righe trovate nel CSV
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Associa le colonne del CSV ai campi del sistema. I campi contrassegnati con * sono obbligatori.
          </p>

          <Card>
            <CardContent className="p-0 divide-y">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center gap-4 px-4 py-3">
                  <Label className="w-48 text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || undefined}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="-- Non mappato --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmapped__">-- Non mappato --</SelectItem>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[field.key] && (
                    <span className="text-xs text-green-600">Mappato</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              Annulla
            </Button>
            <Button onClick={handleProceedToPreview}>
              Anteprima
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Anteprima Dati</h3>
            <span className="text-sm text-gray-500">
              Mostrando prime {previewRows.length} di {csvRows.length} righe
            </span>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {fields
                      .filter((f) => mapping[f.key])
                      .map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-gray-400">{idx + 1}</TableCell>
                      {fields
                        .filter((f) => mapping[f.key])
                        .map((f) => (
                          <TableCell key={f.key} className="whitespace-nowrap max-w-48 truncate">
                            {row[mapping[f.key]] || <span className="text-gray-300">-</span>}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Alert className="border-blue-300 bg-blue-50">
            <AlertDescription className="text-blue-700">
              <p className="font-medium">Riepilogo importazione:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>{csvRows.length} righe totali da importare</li>
                <li>
                  Tipo: {importType === "issued" ? "Fatture emesse" : "Fatture ricevute"}
                </li>
                <li>
                  Clienti/fornitori non trovati verranno creati automaticamente
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Modifica Mappatura
            </Button>
            <Button
              onClick={handleImport}
              className="bg-green-600 hover:bg-green-700"
            >
              Importa
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
      {step === "result" && result && (
        <div className="space-y-4">
          {result.success && result.errors.length === 0 ? (
            <Alert>
              <AlertDescription>
                <h3 className="text-lg font-medium">Importazione completata</h3>
                <div className="mt-2 text-sm">
                  <p>
                    {importType === "issued" ? "Fatture" : "Fatture acquisto"} importate:{" "}
                    <strong>{result.importedCount}</strong>
                  </p>
                  {result.createdClients !== undefined && result.createdClients > 0 && (
                    <p>Clienti creati: <strong>{result.createdClients}</strong></p>
                  )}
                  {result.createdSuppliers !== undefined && result.createdSuppliers > 0 && (
                    <p>Fornitori creati: <strong>{result.createdSuppliers}</strong></p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : result.success ? (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription className="text-yellow-700">
                <h3 className="text-lg font-medium">Importazione completata con avvisi</h3>
                <div className="mt-2 text-sm">
                  <p>
                    {importType === "issued" ? "Fatture" : "Fatture acquisto"} importate:{" "}
                    <strong>{result.importedCount}</strong>
                  </p>
                  {result.createdClients !== undefined && result.createdClients > 0 && (
                    <p>Clienti creati: <strong>{result.createdClients}</strong></p>
                  )}
                  {result.createdSuppliers !== undefined && result.createdSuppliers > 0 && (
                    <p>Fornitori creati: <strong>{result.createdSuppliers}</strong></p>
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
                    {importType === "issued" ? "Fatture" : "Fatture acquisto"} importate:{" "}
                    <strong>{result.importedCount}</strong>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error/Warning List */}
          {result.errors.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="text-sm font-medium text-gray-700">
                    {result.success ? "Avvisi" : "Errori"} ({result.errors.length})
                  </h4>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y">
                  {result.errors.map((err, idx) => (
                    <ErrorRow key={idx} error={err} />
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

function ErrorRow({ error }: { error: ValidationError }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <Badge variant="destructive">
        Riga {error.row}
      </Badge>
      {error.field && (
        <span className="text-gray-500">{error.field}:</span>
      )}
      <span className="text-gray-700">{error.message}</span>
    </div>
  );
}
