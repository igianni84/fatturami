"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// --- Types ---

export interface CreditNoteFormLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId: string;
}

export interface InvoiceForCreditNote {
  id: string;
  number: string;
  currency: string;
  clientName: string;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRateId: string;
    taxRateName: string;
    taxRateRate: number;
  }[];
  taxRates: { id: string; name: string; rate: number }[];
}

export type CreditNoteActionResult = {
  success: boolean;
  creditNoteId?: string;
  errors?: Record<string, string[]>;
  message?: string;
};

// --- Schemas ---

const creditNoteLineSchema = z.object({
  description: z.string().min(1, "La descrizione è obbligatoria"),
  quantity: z.number().positive("La quantità deve essere positiva"),
  unitPrice: z.number().min(0, "Il prezzo unitario non può essere negativo"),
  taxRateId: z.string().min(1, "L'aliquota IVA è obbligatoria"),
});

const creditNoteSchema = z.object({
  invoiceId: z.string().min(1, "La fattura è obbligatoria"),
  date: z.string().min(1, "La data è obbligatoria"),
  notes: z.string(),
  lines: z.array(creditNoteLineSchema).min(1, "Inserire almeno una riga"),
});

export type CreditNoteFormData = z.infer<typeof creditNoteSchema>;

// --- Generate progressive number ---

async function generateCreditNoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `NC-${year}-`;

  const lastNote = await prisma.creditNote.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  let nextNum = 1;
  if (lastNote) {
    const lastNum = parseInt(lastNote.number.split("-")[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// --- Fetch invoice data for credit note form ---

export async function getInvoiceForCreditNote(
  invoiceId: string
): Promise<InvoiceForCreditNote | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: { select: { name: true } },
      lines: {
        include: { taxRate: { select: { id: true, name: true, rate: true } } },
      },
    },
  });

  if (!invoice) return null;

  // Only allow credit notes for emessa, inviata, pagata
  const allowedStatuses = ["emessa", "inviata", "pagata"];
  if (!allowedStatuses.includes(invoice.status)) return null;

  const taxRates = await prisma.taxRate.findMany({
    select: { id: true, name: true, rate: true },
    orderBy: { rate: "desc" },
  });

  return {
    id: invoice.id,
    number: invoice.number,
    currency: invoice.currency,
    clientName: invoice.client.name,
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxRateId: line.taxRate.id,
      taxRateName: line.taxRate.name,
      taxRateRate: Number(line.taxRate.rate),
    })),
    taxRates: taxRates.map((r) => ({
      id: r.id,
      name: r.name,
      rate: Number(r.rate),
    })),
  };
}

// --- Create credit note ---

export async function createCreditNote(
  data: CreditNoteFormData
): Promise<CreditNoteActionResult> {
  const result = creditNoteSchema.safeParse(data);
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

  const { invoiceId, date, notes, lines } = result.data;

  // Verify invoice exists and is in a valid status
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });

  if (!invoice) {
    return { success: false, errors: { invoiceId: ["Fattura non trovata"] } };
  }

  const allowedStatuses = ["emessa", "inviata", "pagata"];
  if (!allowedStatuses.includes(invoice.status)) {
    return {
      success: false,
      message: "La nota di credito può essere creata solo per fatture emesse, inviate o pagate",
    };
  }

  const number = await generateCreditNoteNumber();

  const creditNote = await prisma.creditNote.create({
    data: {
      number,
      invoiceId,
      date: new Date(date),
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

  return { success: true, creditNoteId: creditNote.id, message: "Nota di credito creata con successo" };
}
