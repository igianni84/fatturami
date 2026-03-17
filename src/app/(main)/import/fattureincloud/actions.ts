"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { type InvoiceStatus, type QuoteStatus } from "@prisma/client";
import { detectVatRegime } from "@/lib/vat-regime";
import { getCompanyCountry } from "@/app/(main)/impostazioni/actions";
import { getTaxRatesForCountry } from "@/lib/tax-rates";
import { generateDisclaimer } from "@/lib/disclaimers";
import {
  parseFICFile,
  deriveVatRate,
  type FICParseResult,
  type FICFileType,
  type FICInvoice,
  type FICCreditNote,
  type FICQuote,
  type FICClient,
} from "@/lib/import/fattureincloud-parser";

// --- Types ---

export interface FICDetectResult {
  success: boolean;
  fileType: FICFileType;
  invoiceCount: number;
  creditNoteCount: number;
  quoteCount: number;
  clientCount: number;
  parseErrors: string[];
  // Serialized preview data
  invoices: SerializedFICInvoice[];
  creditNotes: SerializedFICCreditNote[];
  quotes: SerializedFICQuote[];
  clients: FICClient[];
}

export interface SerializedFICInvoice {
  number: string;
  date: string;
  clientName: string;
  clientVatNumber: string;
  imponibile: number;
  iva: number;
  totale: number;
  stato: string;
  currency: string;
  notes: string;
  isDuplicate: boolean;
}

export interface SerializedFICCreditNote {
  number: string;
  date: string;
  clientName: string;
  clientVatNumber: string;
  imponibile: number;
  iva: number;
  totale: number;
  notes: string;
  isDuplicate: boolean;
}

export interface SerializedFICQuote {
  number: string;
  date: string;
  clientName: string;
  clientVatNumber: string;
  imponibile: number;
  iva: number;
  totale: number;
  stato: string;
  notes: string;
  isDuplicate: boolean;
}

export interface FICImportResult {
  success: boolean;
  importedInvoices: number;
  importedCreditNotes: number;
  importedQuotes: number;
  importedClients: number;
  skippedDuplicates: number;
  createdClients: number;
  errors: string[];
}

// --- Detect action (parse + check duplicates) ---

export async function detectFICFile(formData: FormData): Promise<FICDetectResult> {
  await requireUser();
  const { userId } = await requireUser();

  const file = formData.get("file") as File | null;
  if (!file) {
    return emptyDetectResult("Nessun file selezionato");
  }

  const buffer = await file.arrayBuffer();
  let parsed: FICParseResult;
  try {
    parsed = parseFICFile(buffer, file.name);
  } catch (err) {
    return emptyDetectResult(
      `Errore nel parsing del file: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Check for duplicates
  const serializedInvoices: SerializedFICInvoice[] = [];
  for (const inv of parsed.invoices) {
    const existing = await prisma.invoice.findUnique({
      where: { userId_number: { userId, number: inv.number } },
      select: { id: true },
    });
    serializedInvoices.push({
      ...serializeInvoice(inv),
      isDuplicate: !!existing,
    });
  }

  const serializedCreditNotes: SerializedFICCreditNote[] = [];
  for (const cn of parsed.creditNotes) {
    const existing = await prisma.creditNote.findUnique({
      where: { userId_number: { userId, number: cn.number } },
      select: { id: true },
    });
    serializedCreditNotes.push({
      ...serializeCreditNote(cn),
      isDuplicate: !!existing,
    });
  }

  const serializedQuotes: SerializedFICQuote[] = [];
  for (const q of parsed.quotes) {
    const existing = await prisma.quote.findUnique({
      where: { userId_number: { userId, number: q.number } },
      select: { id: true },
    });
    serializedQuotes.push({
      ...serializeQuote(q),
      isDuplicate: !!existing,
    });
  }

  return {
    success: true,
    fileType: parsed.fileType,
    invoiceCount: parsed.invoices.length,
    creditNoteCount: parsed.creditNotes.length,
    quoteCount: parsed.quotes.length,
    clientCount: parsed.clients.length,
    parseErrors: parsed.errors,
    invoices: serializedInvoices,
    creditNotes: serializedCreditNotes,
    quotes: serializedQuotes,
    clients: parsed.clients,
  };
}

// --- Import action ---

export async function importFICData(
  invoices: SerializedFICInvoice[],
  creditNotes: SerializedFICCreditNote[],
  quotes: SerializedFICQuote[],
  clients: FICClient[]
): Promise<FICImportResult> {
  const { userId } = await requireUser();
  const errors: string[] = [];
  let importedInvoices = 0;
  let importedCreditNotes = 0;
  let importedQuotes = 0;
  let importedClients = 0;
  let skippedDuplicates = 0;
  let createdClients = 0;

  const companyCountry = await getCompanyCountry();

  // Load tax rates
  const taxRatesForCountry = await getTaxRatesForCountry();
  const taxRates = taxRatesForCountry.map((tr) => ({
    id: tr.id,
    rate: tr.rate,
    type: tr.type,
  }));

  const defaultTaxRate = taxRates.find((tr) => tr.type === "standard" && tr.rate === 22)
    || taxRates.find((tr) => tr.type === "standard" && tr.rate === 21)
    || taxRates[0];
  const defaultTaxRateId = defaultTaxRate?.id;

  if (!defaultTaxRateId) {
    return {
      success: false,
      importedInvoices: 0,
      importedCreditNotes: 0,
      importedQuotes: 0,
      importedClients: 0,
      skippedDuplicates: 0,
      createdClients: 0,
      errors: ["Nessuna aliquota IVA trovata nel sistema. Eseguire il seed del database."],
    };
  }

  const clientsMap = new Map<string, string>(); // name -> clientId

  // --- Import Clients ---
  for (const client of clients) {
    try {
      const clientId = await findOrCreateClient(
        client.name,
        client.vatNumber,
        client.country,
        client.fiscalCode,
        client.address,
        client.city,
        client.postalCode,
        client.email,
        clientsMap,
        companyCountry,
        userId
      );
      if (clientId) {
        importedClients++;
      }
    } catch (err) {
      errors.push(`Cliente "${client.name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Import Invoices ---
  for (const inv of invoices) {
    if (inv.isDuplicate) {
      skippedDuplicates++;
      continue;
    }

    try {
      // Double-check duplicate
      const existing = await prisma.invoice.findUnique({
        where: { userId_number: { userId, number: inv.number } },
        select: { id: true },
      });
      if (existing) {
        skippedDuplicates++;
        continue;
      }

      const clientId = await findOrCreateClient(
        inv.clientName,
        inv.clientVatNumber,
        "",
        "",
        "",
        "",
        "",
        "",
        clientsMap,
        companyCountry,
        userId
      );

      // Get client VAT regime for disclaimer
      const client = await prisma.client.findUnique({
        where: { id: clientId, userId },
      });
      const vatRegime = client?.vatRegime || "nazionale";
      const disclaimer = generateDisclaimer({
        companyCountry,
        vatRegime,
        hasValidVat: !!(client?.vatNumber),
      });

      // Derive tax rate from imponibile/IVA
      const vatRate = deriveVatRate(inv.imponibile, inv.iva);
      const taxRateId = findTaxRateId(taxRates, vatRate) || defaultTaxRateId;

      const date = new Date(inv.date);
      if (isNaN(date.getTime())) {
        errors.push(`Fattura ${inv.number}: data non valida`);
        continue;
      }

      await prisma.invoice.create({
        data: {
          userId,
          number: inv.number,
          clientId,
          date,
          status: inv.stato as InvoiceStatus,
          currency: inv.currency || "EUR",
          exchangeRate: new Decimal(1),
          disclaimer,
          notes: inv.notes ? `${inv.notes} — Importato da Fatture in Cloud` : "Importato da Fatture in Cloud",
          lines: {
            create: [
              {
                description: "Importato da Fatture in Cloud",
                quantity: new Decimal(1),
                unitPrice: new Decimal(inv.imponibile || inv.totale),
                taxRateId,
              },
            ],
          },
        },
      });

      importedInvoices++;
    } catch (err) {
      errors.push(`Fattura ${inv.number}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Import Credit Notes ---
  // Credit notes in the system require an invoiceId.
  // FIC exports don't link them to invoices, so we skip credit notes
  // that can't be linked, and log a warning.
  for (const cn of creditNotes) {
    if (cn.isDuplicate) {
      skippedDuplicates++;
      continue;
    }

    try {
      const existing = await prisma.creditNote.findUnique({
        where: { userId_number: { userId, number: cn.number } },
        select: { id: true },
      });
      if (existing) {
        skippedDuplicates++;
        continue;
      }

      // Try to find the most recent invoice for this client to link to
      const clientId = await findOrCreateClient(
        cn.clientName,
        cn.clientVatNumber,
        "",
        "",
        "",
        "",
        "",
        "",
        clientsMap,
        companyCountry,
        userId
      );

      const relatedInvoice = await prisma.invoice.findFirst({
        where: { userId, clientId },
        orderBy: { date: "desc" },
        select: { id: true },
      });

      if (!relatedInvoice) {
        errors.push(
          `Nota credito ${cn.number}: nessuna fattura trovata per il cliente "${cn.clientName}" a cui collegarla. Saltata.`
        );
        skippedDuplicates++;
        continue;
      }

      const vatRate = deriveVatRate(cn.imponibile, cn.iva);
      const taxRateId = findTaxRateId(taxRates, vatRate) || defaultTaxRateId;

      const date = new Date(cn.date);
      if (isNaN(date.getTime())) {
        errors.push(`Nota credito ${cn.number}: data non valida`);
        continue;
      }

      await prisma.creditNote.create({
        data: {
          userId,
          number: cn.number,
          invoiceId: relatedInvoice.id,
          date,
          notes: cn.notes
            ? `${cn.notes} — Importato da Fatture in Cloud`
            : "Importato da Fatture in Cloud",
          lines: {
            create: [
              {
                description: "Importato da Fatture in Cloud",
                quantity: new Decimal(1),
                unitPrice: new Decimal(cn.imponibile || cn.totale),
                taxRateId,
              },
            ],
          },
        },
      });

      importedCreditNotes++;
    } catch (err) {
      errors.push(`Nota credito ${cn.number}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Import Quotes ---
  for (const q of quotes) {
    if (q.isDuplicate) {
      skippedDuplicates++;
      continue;
    }

    try {
      const existing = await prisma.quote.findUnique({
        where: { userId_number: { userId, number: q.number } },
        select: { id: true },
      });
      if (existing) {
        skippedDuplicates++;
        continue;
      }

      const clientId = await findOrCreateClient(
        q.clientName,
        q.clientVatNumber,
        "",
        "",
        "",
        "",
        "",
        "",
        clientsMap,
        companyCountry,
        userId
      );

      const vatRate = deriveVatRate(q.imponibile, q.iva);
      const taxRateId = findTaxRateId(taxRates, vatRate) || defaultTaxRateId;

      const date = new Date(q.date);
      if (isNaN(date.getTime())) {
        errors.push(`Preventivo ${q.number}: data non valida`);
        continue;
      }

      await prisma.quote.create({
        data: {
          userId,
          number: q.number,
          clientId,
          date,
          status: q.stato as QuoteStatus,
          notes: q.notes
            ? `${q.notes} — Importato da Fatture in Cloud`
            : "Importato da Fatture in Cloud",
          lines: {
            create: [
              {
                description: "Importato da Fatture in Cloud",
                quantity: new Decimal(1),
                unitPrice: new Decimal(q.imponibile || q.totale),
                taxRateId,
              },
            ],
          },
        },
      });

      importedQuotes++;
    } catch (err) {
      errors.push(`Preventivo ${q.number}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  createdClients = clientsMap.size;

  return {
    success: importedInvoices + importedCreditNotes + importedQuotes + importedClients > 0 || errors.length === 0,
    importedInvoices,
    importedCreditNotes,
    importedQuotes,
    importedClients,
    skippedDuplicates,
    createdClients,
    errors,
  };
}

// --- Helpers ---

function findTaxRateId(
  taxRates: { id: string; rate: number; type: string }[],
  rate: number
): string | null {
  const match = taxRates.find((tr) => Math.abs(tr.rate - rate) < 0.5);
  return match ? match.id : null;
}

async function findOrCreateClient(
  name: string,
  vatNumber: string,
  country: string,
  fiscalCode: string,
  address: string,
  city: string,
  postalCode: string,
  email: string,
  clientsMap: Map<string, string>,
  companyCountry: string,
  userId: string
): Promise<string> {
  const key = name.toLowerCase().trim();

  if (clientsMap.has(key)) {
    return clientsMap.get(key)!;
  }

  // Try to find by VAT number first
  let existing = null;
  if (vatNumber) {
    existing = await prisma.client.findFirst({
      where: {
        userId,
        vatNumber: { contains: vatNumber.trim() },
        deletedAt: null,
      },
    });
  }
  if (!existing) {
    existing = await prisma.client.findFirst({
      where: {
        userId,
        name: { equals: name.trim() },
        deletedAt: null,
      },
    });
  }

  if (existing) {
    clientsMap.set(key, existing.id);
    return existing.id;
  }

  // Create new client
  const clientCountry = country || "IT";
  const vatRegime = detectVatRegime(clientCountry, companyCountry);

  const newClient = await prisma.client.create({
    data: {
      userId,
      name: name.trim(),
      vatNumber: vatNumber?.trim() || "",
      fiscalCode: fiscalCode?.trim() || "",
      address: address?.trim() || "",
      city: city?.trim() || "",
      postalCode: postalCode?.trim() || "",
      country: clientCountry,
      email: email?.trim() || "",
      vatRegime,
    },
  });

  clientsMap.set(key, newClient.id);
  return newClient.id;
}

function serializeInvoice(inv: FICInvoice): Omit<SerializedFICInvoice, "isDuplicate"> {
  return {
    number: inv.number,
    date: inv.date.toISOString(),
    clientName: inv.clientName,
    clientVatNumber: inv.clientVatNumber,
    imponibile: inv.imponibile,
    iva: inv.iva,
    totale: inv.totale,
    stato: inv.stato,
    currency: inv.currency,
    notes: inv.notes,
  };
}

function serializeCreditNote(cn: FICCreditNote): Omit<SerializedFICCreditNote, "isDuplicate"> {
  return {
    number: cn.number,
    date: cn.date.toISOString(),
    clientName: cn.clientName,
    clientVatNumber: cn.clientVatNumber,
    imponibile: cn.imponibile,
    iva: cn.iva,
    totale: cn.totale,
    notes: cn.notes,
  };
}

function serializeQuote(q: FICQuote): Omit<SerializedFICQuote, "isDuplicate"> {
  return {
    number: q.number,
    date: q.date.toISOString(),
    clientName: q.clientName,
    clientVatNumber: q.clientVatNumber,
    imponibile: q.imponibile,
    iva: q.iva,
    totale: q.totale,
    stato: q.stato,
    notes: q.notes,
  };
}

function emptyDetectResult(errorMessage: string): FICDetectResult {
  return {
    success: false,
    fileType: "invoices",
    invoiceCount: 0,
    creditNoteCount: 0,
    quoteCount: 0,
    clientCount: 0,
    parseErrors: [errorMessage],
    invoices: [],
    creditNotes: [],
    quotes: [],
    clients: [],
  };
}
