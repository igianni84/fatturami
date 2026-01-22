"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { VatRegime } from "@prisma/client";

// --- Types ---

export interface ClientOptionWithVat {
  id: string;
  name: string;
  vatRegime: VatRegime;
  vatNumber: string;
  currency: string;
  country: string;
}

export interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
  type: string;
}

export type InvoiceActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// --- Line item schema ---

const lineSchema = z.object({
  description: z.string().min(1, "La descrizione è obbligatoria"),
  quantity: z.number().positive("La quantità deve essere positiva"),
  unitPrice: z.number().min(0, "Il prezzo unitario non può essere negativo"),
  taxRateId: z.string().min(1, "L'aliquota IVA è obbligatoria"),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Il cliente è obbligatorio"),
  date: z.string().min(1, "La data è obbligatoria"),
  dueDate: z.string(),
  currency: z.string().min(1, "La valuta è obbligatoria"),
  exchangeRate: z.number().positive("Il tasso di cambio deve essere positivo"),
  notes: z.string(),
  lines: z.array(lineSchema).min(1, "Inserire almeno una riga"),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// --- Fetch clients with VAT info for invoice form ---

export async function getClientsForInvoice(): Promise<ClientOptionWithVat[]> {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      vatRegime: true,
      vatNumber: true,
      currency: true,
      country: true,
    },
    orderBy: { name: "asc" },
  });
  return clients;
}

// --- Fetch tax rates for dropdown ---

export async function getTaxRatesForInvoice(): Promise<TaxRateOption[]> {
  const rates = await prisma.taxRate.findMany({
    select: { id: true, name: true, rate: true, type: true },
    orderBy: { rate: "desc" },
  });
  return rates.map((r) => ({
    id: r.id,
    name: r.name,
    rate: Number(r.rate),
    type: r.type,
  }));
}

// --- Generate progressive number ---

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.number.split("-")[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// --- Determine default tax rate based on client VAT regime ---

function getDefaultTaxRateType(vatRegime: VatRegime, hasValidVat: boolean): string {
  switch (vatRegime) {
    case VatRegime.nazionale:
      return "standard"; // 21% Spanish IVA
    case VatRegime.intraUE:
      return hasValidVat ? "reverse_charge" : "standard"; // Reverse charge if valid VAT, else 21%
    case VatRegime.extraUE:
      return "export_exempt"; // 0% export
    default:
      return "standard";
  }
}

// --- Generate legal disclaimer based on VAT regime ---

function generateDisclaimer(vatRegime: VatRegime, hasValidVat: boolean): string {
  switch (vatRegime) {
    case VatRegime.intraUE:
      if (hasValidVat) {
        return "Operazione in reverse charge ai sensi dell'art. 196 Direttiva 2006/112/CE";
      }
      return "";
    case VatRegime.extraUE:
      return "Operazione non soggetta a IVA ai sensi dell'art. 21 Ley 37/1992";
    default:
      return "";
  }
}

// --- Create invoice ---

export async function createInvoice(
  data: InvoiceFormData
): Promise<InvoiceActionResult> {
  const result = invoiceSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[]>;
    if (result.error.issues.some((i) => i.path[0] === "lines")) {
      const lineErrors = result.error.issues
        .filter((i) => i.path[0] === "lines")
        .map((i) => i.message);
      fieldErrors.lines = [...new Set(lineErrors)];
    }
    return { success: false, errors: fieldErrors };
  }

  const { clientId, date, dueDate, currency, exchangeRate, notes, lines } = result.data;

  // Fetch client to determine VAT regime and disclaimer
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { vatRegime: true, vatNumber: true },
  });

  if (!client) {
    return { success: false, errors: { clientId: ["Cliente non trovato"] } };
  }

  const disclaimer = generateDisclaimer(client.vatRegime, !!client.vatNumber);
  const number = await generateInvoiceNumber();

  await prisma.invoice.create({
    data: {
      number,
      clientId,
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "bozza",
      currency,
      exchangeRate: new Decimal(exchangeRate),
      disclaimer,
      notes,
      lines: {
        create: lines.map((line) => ({
          description: line.description,
          quantity: new Decimal(line.quantity),
          unitPrice: new Decimal(line.unitPrice),
          taxRateId: line.taxRateId,
        })),
      },
    },
  });

  return { success: true, message: "Fattura creata con successo" };
}

// --- Export helper for client components ---

export async function getDefaultTaxRateForClient(
  clientId: string
): Promise<{ taxRateType: string; vatRegime: VatRegime } | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { vatRegime: true, vatNumber: true },
  });
  if (!client) return null;

  return {
    taxRateType: getDefaultTaxRateType(client.vatRegime, !!client.vatNumber),
    vatRegime: client.vatRegime,
  };
}
