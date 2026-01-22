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
      if (csvColumn === "") {
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
      <div className="flex gap-4 rounded-lg border border-gray-200 p-4">
        <label className="text-sm font-medium text-gray-700">Tipo di importazione:</label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setImportType("issued");
              if (step !== "upload") handleReset();
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              importType === "issued"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Fatture Emesse
          </button>
          <button
            onClick={() => {
              setImportType("received");
              if (step !== "upload") handleReset();
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              importType === "received"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Fatture Ricevute
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
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
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="mx-auto block text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
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

          <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
            {fields.map((field) => (
              <div key={field.key} className="flex items-center gap-4 px-4 py-3">
                <label className="w-48 text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">-- Non mappato --</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                {mapping[field.key] && (
                  <span className="text-xs text-green-600">Mappato</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Annulla
            </button>
            <button
              onClick={handleProceedToPreview}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Anteprima
            </button>
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

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                  {fields
                    .filter((f) => mapping[f.key])
                    .map((f) => (
                      <th key={f.key} className="px-3 py-2 text-left font-medium text-gray-500">
                        {f.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    {fields
                      .filter((f) => mapping[f.key])
                      .map((f) => (
                        <td key={f.key} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-48 truncate">
                          {row[mapping[f.key]] || <span className="text-gray-300">-</span>}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
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
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("mapping")}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Modifica Mappatura
            </button>
            <button
              onClick={handleImport}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Importa
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
      {step === "result" && result && (
        <div className="space-y-4">
          <div
            className={`rounded-md p-4 ${
              result.success && result.errors.length === 0
                ? "bg-green-50 border border-green-200"
                : result.success
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-red-50 border border-red-200"
            }`}
          >
            <h3
              className={`text-lg font-medium ${
                result.success && result.errors.length === 0
                  ? "text-green-800"
                  : result.success
                    ? "text-yellow-800"
                    : "text-red-800"
              }`}
            >
              {result.success
                ? result.errors.length === 0
                  ? "Importazione completata"
                  : "Importazione completata con avvisi"
                : "Importazione fallita"}
            </h3>
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
          </div>

          {/* Error/Warning List */}
          {result.errors.length > 0 && (
            <div className="rounded-lg border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">
                  {result.success ? "Avvisi" : "Errori"} ({result.errors.length})
                </h4>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {result.errors.map((err, idx) => (
                  <ErrorRow key={idx} error={err} />
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

function ErrorRow({ error }: { error: ValidationError }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Riga {error.row}
      </span>
      {error.field && (
        <span className="text-gray-500">{error.field}:</span>
      )}
      <span className="text-gray-700">{error.message}</span>
    </div>
  );
}
