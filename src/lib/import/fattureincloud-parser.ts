import * as XLSX from "xlsx";

// --- Types ---

export type FICFileType = "invoices" | "credit_notes" | "quotes" | "clients";

export interface FICInvoice {
  number: string;
  date: Date;
  clientName: string;
  clientVatNumber: string;
  imponibile: number;
  iva: number;
  totale: number;
  stato: string;
  currency: string;
  notes: string;
}

export interface FICCreditNote {
  number: string;
  date: Date;
  clientName: string;
  clientVatNumber: string;
  imponibile: number;
  iva: number;
  totale: number;
  notes: string;
}

export interface FICQuote {
  number: string;
  date: Date;
  clientName: string;
  clientVatNumber: string;
  imponibile: number;
  iva: number;
  totale: number;
  stato: string;
  notes: string;
}

export interface FICClient {
  name: string;
  vatNumber: string;
  fiscalCode: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email: string;
}

export interface FICParseResult {
  fileType: FICFileType;
  invoices: FICInvoice[];
  creditNotes: FICCreditNote[];
  quotes: FICQuote[];
  clients: FICClient[];
  errors: string[];
}

// --- Helpers ---

/**
 * Parses an Italian-formatted number (e.g. "1.234,56" or "1234,56")
 * Returns 0 if unparseable.
 */
function parseItalianNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  const str = String(value).trim();
  if (!str) return 0;

  // Remove thousands separators (dots) and replace comma with dot for decimal
  // Handle cases like "1.234,56" -> "1234.56"
  const cleaned = str
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses an Italian date from various formats (DD/MM/YYYY, DD-MM-YYYY, etc.)
 */
function parseItalianDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    // Excel serial date number
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const euMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (euMatch) {
    const d = new Date(Number(euMatch[3]), Number(euMatch[2]) - 1, Number(euMatch[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function getString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return "";
}

function getNumber(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    if (row[key] != null) {
      const num = parseItalianNumber(row[key]);
      if (num !== 0) return num;
    }
  }
  return 0;
}

function getDate(row: Record<string, unknown>, ...keys: string[]): Date | null {
  for (const key of keys) {
    if (row[key] != null) {
      const d = parseItalianDate(row[key]);
      if (d) return d;
    }
  }
  return null;
}

// --- Detection ---

const INVOICE_MARKERS = ["Numero", "Data", "Cliente", "Totale", "Imponibile"];
const CREDIT_NOTE_MARKERS = ["Numero", "Data", "Cliente", "Totale"];
const QUOTE_MARKERS = ["Numero", "Data", "Cliente"];
const CLIENT_MARKERS = ["Nome", "Ragione Sociale", "P.IVA", "Partita IVA"];

function detectFileType(headers: string[], fileName: string): FICFileType {
  const lowerFileName = fileName.toLowerCase();
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // File name heuristics first
  if (lowerFileName.includes("nc_") || lowerFileName.includes("note_credito") || lowerFileName.includes("notecredito")) {
    return "credit_notes";
  }
  if (lowerFileName.includes("preventiv")) {
    return "quotes";
  }
  if (lowerFileName.includes("lista_clienti") || lowerFileName.includes("clienti")) {
    // Check headers too — client lists have different columns
    const hasClientHeaders = CLIENT_MARKERS.some((m) =>
      lowerHeaders.some((h) => h.includes(m.toLowerCase()))
    );
    if (hasClientHeaders && !lowerHeaders.some((h) => h.includes("imponibile"))) {
      return "clients";
    }
  }
  if (lowerFileName.includes("fattur")) {
    return "invoices";
  }

  // Header-based detection
  const hasImponibile = lowerHeaders.some((h) => h.includes("imponibile"));
  const hasCliente = lowerHeaders.some((h) => h.includes("cliente"));
  const hasNumero = lowerHeaders.some((h) => h.includes("numero"));

  if (hasNumero && hasCliente && hasImponibile) {
    return "invoices";
  }
  if (hasNumero && hasCliente) {
    return "quotes";
  }

  // Default fallback
  return "invoices";
}

// --- FIC Status mapping ---

function mapFICInvoiceStatus(stato: string): string {
  const lower = stato.toLowerCase().trim();
  if (lower.includes("pagat") || lower === "pagata" || lower === "pagato") return "pagata";
  if (lower.includes("inviat") || lower === "inviata" || lower === "inviato") return "inviata";
  if (lower.includes("scadut") || lower === "scaduta" || lower === "scaduto") return "scaduta";
  if (lower.includes("bozza")) return "bozza";
  if (lower.includes("emess") || lower === "emessa" || lower === "emesso") return "emessa";
  if (lower.includes("parzial")) return "parzialmente_pagata";
  // Default: imported invoices are treated as emessa
  return "emessa";
}

function mapFICQuoteStatus(stato: string): string {
  const lower = stato.toLowerCase().trim();
  if (lower.includes("accettat")) return "accettato";
  if (lower.includes("rifiutat")) return "rifiutato";
  if (lower.includes("scadut")) return "scaduto";
  if (lower.includes("inviat")) return "inviato";
  if (lower.includes("convertit")) return "convertito";
  if (lower.includes("bozza")) return "bozza";
  return "inviato";
}

// --- Parsers ---

function parseInvoices(rows: Record<string, unknown>[]): { invoices: FICInvoice[]; errors: string[] } {
  const invoices: FICInvoice[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const number = getString(row, "Numero", "N.", "Num.", "numero", "N° Documento");
    const clientName = getString(row, "Cliente", "Ragione Sociale Cliente", "cliente", "Ragione sociale");
    const dateRaw = getDate(row, "Data", "Data Documento", "data", "Data documento");

    if (!number && !clientName) {
      // Skip empty rows
      continue;
    }

    if (!number) {
      errors.push(`Riga ${i + 2}: numero fattura mancante`);
      continue;
    }
    if (!dateRaw) {
      errors.push(`Riga ${i + 2}: data non valida per fattura ${number}`);
      continue;
    }

    invoices.push({
      number,
      date: dateRaw,
      clientName,
      clientVatNumber: getString(row, "P.IVA", "Partita IVA", "P.IVA Cliente", "P.IVA/CF", "p.iva"),
      imponibile: getNumber(row, "Imponibile", "imponibile", "Importo Netto"),
      iva: getNumber(row, "IVA", "iva", "Importo IVA", "Tot. IVA"),
      totale: getNumber(row, "Totale", "totale", "Tot. Documento", "Importo Totale"),
      stato: mapFICInvoiceStatus(getString(row, "Stato", "stato", "Status")),
      currency: getString(row, "Valuta", "valuta") || "EUR",
      notes: getString(row, "Note", "note", "Descrizione"),
    });
  }

  return { invoices, errors };
}

function parseCreditNotes(rows: Record<string, unknown>[]): { creditNotes: FICCreditNote[]; errors: string[] } {
  const creditNotes: FICCreditNote[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const number = getString(row, "Numero", "N.", "Num.", "numero", "N° Documento");
    const clientName = getString(row, "Cliente", "Ragione Sociale Cliente", "cliente", "Ragione sociale");
    const dateRaw = getDate(row, "Data", "Data Documento", "data", "Data documento");

    if (!number && !clientName) continue;

    if (!number) {
      errors.push(`Riga ${i + 2}: numero nota credito mancante`);
      continue;
    }
    if (!dateRaw) {
      errors.push(`Riga ${i + 2}: data non valida per nota credito ${number}`);
      continue;
    }

    creditNotes.push({
      number,
      date: dateRaw,
      clientName,
      clientVatNumber: getString(row, "P.IVA", "Partita IVA", "P.IVA Cliente", "P.IVA/CF"),
      imponibile: getNumber(row, "Imponibile", "imponibile", "Importo Netto"),
      iva: getNumber(row, "IVA", "iva", "Importo IVA", "Tot. IVA"),
      totale: getNumber(row, "Totale", "totale", "Tot. Documento", "Importo Totale"),
      notes: getString(row, "Note", "note", "Descrizione"),
    });
  }

  return { creditNotes, errors };
}

function parseQuotes(rows: Record<string, unknown>[]): { quotes: FICQuote[]; errors: string[] } {
  const quotes: FICQuote[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const number = getString(row, "Numero", "N.", "Num.", "numero", "N° Documento");
    const clientName = getString(row, "Cliente", "Ragione Sociale Cliente", "cliente", "Ragione sociale");
    const dateRaw = getDate(row, "Data", "Data Documento", "data", "Data documento");

    if (!number && !clientName) continue;

    if (!number) {
      errors.push(`Riga ${i + 2}: numero preventivo mancante`);
      continue;
    }
    if (!dateRaw) {
      errors.push(`Riga ${i + 2}: data non valida per preventivo ${number}`);
      continue;
    }

    quotes.push({
      number,
      date: dateRaw,
      clientName,
      clientVatNumber: getString(row, "P.IVA", "Partita IVA", "P.IVA Cliente", "P.IVA/CF"),
      imponibile: getNumber(row, "Imponibile", "imponibile", "Importo Netto"),
      iva: getNumber(row, "IVA", "iva", "Importo IVA", "Tot. IVA"),
      totale: getNumber(row, "Totale", "totale", "Tot. Documento", "Importo Totale"),
      stato: mapFICQuoteStatus(getString(row, "Stato", "stato", "Status")),
      notes: getString(row, "Note", "note", "Descrizione"),
    });
  }

  return { quotes, errors };
}

function parseClients(rows: Record<string, unknown>[]): { clients: FICClient[]; errors: string[] } {
  const clients: FICClient[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = getString(row, "Ragione Sociale", "Nome", "Ragione sociale", "ragione sociale", "Denominazione");

    if (!name) continue;

    clients.push({
      name,
      vatNumber: getString(row, "P.IVA", "Partita IVA", "P.IVA/CF", "p.iva", "Partita Iva"),
      fiscalCode: getString(row, "Codice Fiscale", "CF", "codice fiscale", "C.F."),
      address: getString(row, "Indirizzo", "Via", "indirizzo"),
      city: getString(row, "Città", "Comune", "città", "Citta"),
      postalCode: getString(row, "CAP", "cap", "Codice Postale"),
      country: getString(row, "Paese", "Nazione", "paese", "Stato") || "IT",
      email: getString(row, "Email", "email", "E-mail", "PEC"),
    });
  }

  return { clients, errors };
}

// --- Main parser ---

export function parseFICFile(buffer: ArrayBuffer, fileName: string): FICParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const result: FICParseResult = {
    fileType: "invoices",
    invoices: [],
    creditNotes: [],
    quotes: [],
    clients: [],
    errors: [],
  };

  if (workbook.SheetNames.length === 0) {
    result.errors.push("Il file non contiene fogli di lavoro");
    return result;
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    result.errors.push("Il foglio di lavoro è vuoto");
    return result;
  }

  // Get headers from first row keys
  const headers = Object.keys(rows[0]);
  result.fileType = detectFileType(headers, fileName);

  switch (result.fileType) {
    case "invoices": {
      const parsed = parseInvoices(rows);
      result.invoices = parsed.invoices;
      result.errors = parsed.errors;
      break;
    }
    case "credit_notes": {
      const parsed = parseCreditNotes(rows);
      result.creditNotes = parsed.creditNotes;
      result.errors = parsed.errors;
      break;
    }
    case "quotes": {
      const parsed = parseQuotes(rows);
      result.quotes = parsed.quotes;
      result.errors = parsed.errors;
      break;
    }
    case "clients": {
      const parsed = parseClients(rows);
      result.clients = parsed.clients;
      result.errors = parsed.errors;
      break;
    }
  }

  return result;
}

/**
 * Derives the IVA rate percentage from imponibile and IVA amount.
 * Falls back to 22 if it can't compute.
 */
export function deriveVatRate(imponibile: number, iva: number): number {
  if (imponibile <= 0) return 22;
  const rate = (iva / imponibile) * 100;
  // Round to nearest common rate
  const commonRates = [0, 4, 5, 10, 22];
  const closest = commonRates.reduce((prev, curr) =>
    Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev
  );
  // Only use closest if within 2% tolerance
  if (Math.abs(closest - rate) < 2) return closest;
  return Math.round(rate * 100) / 100;
}
