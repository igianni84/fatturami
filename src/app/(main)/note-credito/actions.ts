"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/document-numbers";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { getFieldErrors } from "@/lib/utils";

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

// --- Fetch invoice data for credit note form ---

export async function getInvoiceForCreditNote(
  invoiceId: string
): Promise<InvoiceForCreditNote | null> {
  const { userId } = await requireUser();
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId },
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

// --- Types for list ---

export interface CreditNoteListItem {
  id: string;
  number: string;
  invoiceNumber: string;
  invoiceId: string;
  clientName: string;
  date: string;
  total: number;
  currency: string;
}

// --- Fetch credit notes for list ---

export async function getCreditNotes(params: {
  page?: number;
  pageSize?: number;
}): Promise<{ items: CreditNoteListItem[]; totalCount: number }> {
  const { userId } = await requireUser();
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const [creditNotes, totalCount] = await Promise.all([
    prisma.creditNote.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
      include: {
        invoice: {
          include: {
            client: { select: { name: true } },
          },
        },
        lines: {
          include: { taxRate: { select: { rate: true } } },
        },
      },
    }),
    prisma.creditNote.count({ where: { userId } }),
  ]);

  const items: CreditNoteListItem[] = creditNotes.map((cn) => {
    const total = cn.lines.reduce((sum, line) => {
      const lineSubtotal = Number(line.quantity) * Number(line.unitPrice);
      const lineTax = lineSubtotal * (Number(line.taxRate.rate) / 100);
      return sum + lineSubtotal + lineTax;
    }, 0);

    return {
      id: cn.id,
      number: cn.number,
      invoiceNumber: cn.invoice.number,
      invoiceId: cn.invoice.id,
      clientName: cn.invoice.client.name,
      date: cn.date.toISOString().split("T")[0],
      total,
      currency: cn.invoice.currency,
    };
  });

  return { items, totalCount };
}

// --- Delete credit note ---

export async function deleteCreditNote(
  creditNoteId: string
): Promise<CreditNoteActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  const creditNote = await prisma.creditNote.findUnique({
    where: { id: creditNoteId, userId: user.userId },
    select: { id: true },
  });

  if (!creditNote) {
    return { success: false, message: "Nota di credito non trovata" };
  }

  await prisma.creditNote.delete({ where: { id: creditNoteId, userId: user.userId } });
  return { success: true, message: "Nota di credito eliminata" };
}

// --- Create credit note ---

export async function createCreditNote(
  data: CreditNoteFormData
): Promise<CreditNoteActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  const result = creditNoteSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors = getFieldErrors(result.error);
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
    where: { id: invoiceId, userId: user.userId },
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

  const number = await generateDocumentNumber("NC", (prefix) =>
    prisma.creditNote.findFirst({
      where: { userId: user.userId, number: { startsWith: prefix } },
      orderBy: { number: "desc" },
    })
  );

  const creditNote = await prisma.creditNote.create({
    data: {
      userId: user.userId,
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
