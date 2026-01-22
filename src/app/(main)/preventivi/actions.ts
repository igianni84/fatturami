"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// --- Types ---

export interface ClientOption {
  id: string;
  name: string;
}

export interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

export type QuoteActionResult = {
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

const quoteSchema = z.object({
  clientId: z.string().min(1, "Il cliente è obbligatorio"),
  date: z.string().min(1, "La data è obbligatoria"),
  expiryDate: z.string(),
  notes: z.string(),
  lines: z.array(lineSchema).min(1, "Inserire almeno una riga"),
});

export type QuoteFormData = z.infer<typeof quoteSchema>;

// --- Fetch clients for dropdown ---

export async function getClientsForSelect(): Promise<ClientOption[]> {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return clients;
}

// --- Fetch tax rates for dropdown ---

export async function getTaxRates(): Promise<TaxRateOption[]> {
  const rates = await prisma.taxRate.findMany({
    select: { id: true, name: true, rate: true },
    orderBy: { rate: "desc" },
  });
  return rates.map((r) => ({
    id: r.id,
    name: r.name,
    rate: Number(r.rate),
  }));
}

// --- Generate progressive number ---

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PREV-${year}-`;

  const lastQuote = await prisma.quote.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  let nextNum = 1;
  if (lastQuote) {
    const lastNum = parseInt(lastQuote.number.split("-")[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// --- Types for quote list ---

export interface QuoteListItem {
  id: string;
  number: string;
  clientName: string;
  date: string;
  expiryDate: string | null;
  total: number;
  status: string;
}

export interface QuoteListResult {
  quotes: QuoteListItem[];
  totalCount: number;
}

// --- Fetch quotes with pagination ---

export async function getQuotes(params: {
  page?: number;
  pageSize?: number;
}): Promise<QuoteListResult> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const [quotes, totalCount] = await Promise.all([
    prisma.quote.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        lines: {
          include: { taxRate: { select: { rate: true } } },
        },
      },
    }),
    prisma.quote.count(),
  ]);

  const result: QuoteListItem[] = quotes.map((q) => {
    const total = q.lines.reduce((sum, line) => {
      const subtotal = Number(line.quantity) * Number(line.unitPrice);
      const tax = subtotal * (Number(line.taxRate.rate) / 100);
      return sum + subtotal + tax;
    }, 0);

    return {
      id: q.id,
      number: q.number,
      clientName: q.client.name,
      date: q.date.toISOString().split("T")[0],
      expiryDate: q.expiryDate ? q.expiryDate.toISOString().split("T")[0] : null,
      total,
      status: q.status,
    };
  });

  return { quotes: result, totalCount };
}

// --- Update quote status ---

export async function updateQuoteStatus(
  quoteId: string,
  newStatus: string
): Promise<QuoteActionResult> {
  const validStatuses = ["bozza", "inviato", "accettato", "rifiutato", "scaduto"];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, message: "Stato non valido" };
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: newStatus as "bozza" | "inviato" | "accettato" | "rifiutato" | "scaduto" },
  });

  return { success: true, message: "Stato aggiornato" };
}

// --- Create quote ---

export async function createQuote(
  data: QuoteFormData
): Promise<QuoteActionResult> {
  const result = quoteSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[]>;
    // Flatten line item errors to a general message
    if (result.error.issues.some((i) => i.path[0] === "lines")) {
      const lineErrors = result.error.issues
        .filter((i) => i.path[0] === "lines")
        .map((i) => i.message);
      fieldErrors.lines = [...new Set(lineErrors)];
    }
    return { success: false, errors: fieldErrors };
  }

  const { clientId, date, expiryDate, notes, lines } = result.data;

  const number = await generateQuoteNumber();

  await prisma.quote.create({
    data: {
      number,
      clientId,
      date: new Date(date),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes,
      status: "bozza",
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

  return { success: true, message: "Preventivo creato con successo" };
}
