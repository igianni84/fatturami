"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/document-numbers";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { VatRegime, InvoiceStatus, Prisma } from "@prisma/client";
import { getFieldErrors } from "@/lib/utils";

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
  const { userId } = await requireUser();
  const clients = await prisma.client.findMany({
    where: { userId, deletedAt: null },
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

import { getTaxRatesForCountry } from "@/lib/tax-rates";
import { generateDisclaimer } from "@/lib/disclaimers";
import { getCompanyCountry } from "@/app/(main)/impostazioni/actions";

export async function getTaxRatesForInvoice(): Promise<TaxRateOption[]> {
  return getTaxRatesForCountry();
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

// generateDisclaimer imported from @/lib/disclaimers

// --- Create invoice ---

export async function createInvoice(
  data: InvoiceFormData
): Promise<InvoiceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  const result = invoiceSchema.safeParse(data);
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

  const { clientId, date, dueDate, currency, exchangeRate, notes, lines } = result.data;

  // Fetch client to determine VAT regime and disclaimer (exclude soft-deleted)
  const client = await prisma.client.findUnique({
    where: { id: clientId, userId: user.userId, deletedAt: null },
    select: { vatRegime: true, vatNumber: true },
  });

  if (!client) {
    return { success: false, errors: { clientId: ["Cliente non trovato o non più attivo"] } };
  }

  const companyCountry = await getCompanyCountry();
  const disclaimer = generateDisclaimer({ companyCountry, vatRegime: client.vatRegime, hasValidVat: !!client.vatNumber });
  const number = await generateDocumentNumber("FTT", (prefix) =>
    prisma.invoice.findFirst({
      where: { userId: user.userId, number: { startsWith: prefix } },
      orderBy: { number: "desc" },
    })
  );

  await prisma.invoice.create({
    data: {
      userId: user.userId,
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

// --- Types for invoice list ---

export interface InvoiceListItem {
  id: string;
  number: string;
  clientName: string;
  date: string;
  dueDate: string | null;
  total: number;
  totalPaid: number;
  currency: string;
  status: string;
}

export interface InvoiceListResult {
  invoices: InvoiceListItem[];
  totalCount: number;
}

// --- Fetch invoices with pagination and status filter ---

export async function getInvoices(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<InvoiceListResult> {
  const { userId } = await requireUser();
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const where: Prisma.InvoiceWhereInput = { userId };
  if (params.status && params.status !== "tutti") {
    where.status = params.status as InvoiceStatus;
  }

  const [invoices, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        lines: {
          include: { taxRate: { select: { rate: true } } },
        },
        payments: { select: { amount: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const result: InvoiceListItem[] = invoices.map((inv) => {
    const total = inv.lines.reduce((sum, line) => {
      const subtotal = Number(line.quantity) * Number(line.unitPrice);
      const tax = subtotal * (Number(line.taxRate.rate) / 100);
      return sum + subtotal + tax;
    }, 0);

    const totalPaid = inv.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    return {
      id: inv.id,
      number: inv.number,
      clientName: inv.client.name,
      date: inv.date.toISOString().split("T")[0],
      dueDate: inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : null,
      total,
      totalPaid,
      currency: inv.currency,
      status: inv.status,
    };
  });

  return { invoices: result, totalCount };
}

// --- Update invoice status ---

export async function updateInvoiceStatus(
  invoiceId: string,
  newStatus: string
): Promise<InvoiceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  const validStatuses = ["bozza", "emessa", "inviata", "parzialmente_pagata", "pagata", "scaduta"];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, message: "Stato non valido" };
  }

  // Validate state transitions server-side
  const statusTransitions: Record<string, string[]> = {
    bozza: ["emessa"],
    emessa: ["inviata", "scaduta"],
    inviata: ["scaduta"],
    parzialmente_pagata: ["scaduta"],
    pagata: [],
    scaduta: [],
  };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId: user.userId },
    select: { status: true },
  });

  if (!invoice) {
    return { success: false, message: "Fattura non trovata" };
  }

  const allowedTransitions = statusTransitions[invoice.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    return {
      success: false,
      message: `Transizione non consentita: ${invoice.status} → ${newStatus}`,
    };
  }

  await prisma.invoice.update({
    where: { id: invoiceId, userId: user.userId },
    data: {
      status: newStatus as InvoiceStatus,
    },
  });

  return { success: true, message: "Stato aggiornato" };
}

// --- Delete invoice ---

export async function deleteInvoice(
  invoiceId: string
): Promise<InvoiceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId: user.userId },
    select: { status: true, creditNotes: { select: { id: true } } },
  });

  if (!invoice) {
    return { success: false, message: "Fattura non trovata" };
  }

  if (invoice.creditNotes.length > 0) {
    return { success: false, message: "Impossibile eliminare: la fattura ha note di credito collegate" };
  }

  await prisma.invoice.delete({ where: { id: invoiceId, userId: user.userId } });
  return { success: true, message: "Fattura eliminata" };
}

// --- Fetch single invoice detail ---

export interface InvoiceDetail {
  id: string;
  number: string;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
  status: string;
  currency: string;
  exchangeRate: number;
  disclaimer: string;
  notes: string;
  client: {
    name: string;
    vatNumber: string;
    address: string;
    country: string;
    vatRegime: string;
  };
  lines: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: { name: string; rate: number };
  }[];
  payments: {
    id: string;
    amount: number;
    date: string;
    method: string;
    notes: string;
  }[];
  totalPaid: number;
  remaining: number;
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  const { userId } = await requireUser();
  const invoice = await prisma.invoice.findUnique({
    where: { id, userId },
    include: {
      client: {
        select: {
          name: true,
          vatNumber: true,
          address: true,
          country: true,
          vatRegime: true,
        },
      },
      lines: {
        include: { taxRate: { select: { name: true, rate: true } } },
      },
      payments: {
        select: { id: true, amount: true, date: true, method: true, notes: true },
        orderBy: { date: "asc" as const },
      },
    },
  });

  if (!invoice) return null;

  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const invoiceTotal = invoice.lines.reduce((sum, line) => {
    const subtotal = Number(line.quantity) * Number(line.unitPrice);
    const tax = subtotal * (Number(line.taxRate.rate) / 100);
    return sum + subtotal + tax;
  }, 0);

  return {
    id: invoice.id,
    number: invoice.number,
    date: invoice.date.toISOString().split("T")[0],
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().split("T")[0] : null,
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString().split("T")[0] : null,
    status: invoice.status,
    currency: invoice.currency,
    exchangeRate: Number(invoice.exchangeRate),
    disclaimer: invoice.disclaimer,
    notes: invoice.notes || "",
    client: {
      name: invoice.client.name,
      vatNumber: invoice.client.vatNumber || "",
      address: invoice.client.address || "",
      country: invoice.client.country,
      vatRegime: invoice.client.vatRegime,
    },
    lines: invoice.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxRate: {
        name: line.taxRate.name,
        rate: Number(line.taxRate.rate),
      },
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      date: p.date.toISOString().split("T")[0],
      method: p.method,
      notes: p.notes,
    })),
    totalPaid,
    remaining: invoiceTotal - totalPaid,
  };
}

// --- Export helper for client components ---

export async function getDefaultTaxRateForClient(
  clientId: string
): Promise<{ taxRateType: string; vatRegime: VatRegime } | null> {
  const { userId } = await requireUser();
  const client = await prisma.client.findUnique({
    where: { id: clientId, userId, deletedAt: null },
    select: { vatRegime: true, vatNumber: true },
  });
  if (!client) return null;

  return {
    taxRateType: getDefaultTaxRateType(client.vatRegime, !!client.vatNumber),
    vatRegime: client.vatRegime,
  };
}

// --- Convert quote to invoice ---

export async function convertQuoteToInvoice(
  quoteId: string
): Promise<{ success: boolean; invoiceId?: string; message?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  // Fetch quote with lines and client info
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId, userId: user.userId },
    include: {
      client: { select: { id: true, vatRegime: true, vatNumber: true, currency: true } },
      lines: { select: { description: true, quantity: true, unitPrice: true, taxRateId: true } },
    },
  });

  if (!quote) {
    return { success: false, message: "Preventivo non trovato" };
  }

  if (quote.status !== "accettato") {
    return { success: false, message: "Solo i preventivi accettati possono essere convertiti" };
  }

  // Verify client is still active (not soft-deleted)
  const activeClient = await prisma.client.findUnique({
    where: { id: quote.client.id, userId: user.userId, deletedAt: null },
    select: { id: true },
  });
  if (!activeClient) {
    return { success: false, message: "Il cliente associato al preventivo non è più attivo" };
  }

  // Generate disclaimer and invoice number
  const companyCountry = await getCompanyCountry();
  const disclaimer = generateDisclaimer({ companyCountry, vatRegime: quote.client.vatRegime, hasValidVat: !!quote.client.vatNumber });
  const number = await generateDocumentNumber("FTT", (prefix) =>
    prisma.invoice.findFirst({
      where: { userId: user.userId, number: { startsWith: prefix } },
      orderBy: { number: "desc" },
    })
  );

  // Create invoice from quote data
  const invoice = await prisma.invoice.create({
    data: {
      userId: user.userId,
      number,
      clientId: quote.client.id,
      date: new Date(),
      status: "bozza",
      currency: quote.client.currency || "EUR",
      exchangeRate: new Decimal(1),
      disclaimer,
      notes: quote.notes || "",
      lines: {
        create: quote.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRateId: line.taxRateId,
        })),
      },
    },
  });

  // Update quote status to convertito
  await prisma.quote.update({
    where: { id: quoteId, userId: user.userId },
    data: { status: "convertito" },
  });

  return { success: true, invoiceId: invoice.id };
}

// --- Payment schema ---

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "L'ID fattura è obbligatorio"),
  amount: z.number().positive("L'importo deve essere positivo"),
  date: z.string().min(1, "La data è obbligatoria"),
  method: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

// --- Add payment to invoice ---

export async function addPayment(data: {
  invoiceId: string;
  amount: number;
  date: string;
  method?: string;
  notes?: string;
}): Promise<InvoiceActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Non autenticato" };

  const result = paymentSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: getFieldErrors(result.error),
    };
  }

  const { invoiceId, amount, date, method, notes } = result.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, userId: user.userId },
    include: {
      lines: { include: { taxRate: { select: { rate: true } } } },
      payments: { select: { amount: true } },
    },
  });

  if (!invoice) return { success: false, message: "Fattura non trovata" };

  const payableStatuses = ["emessa", "inviata", "parzialmente_pagata", "scaduta"];
  if (!payableStatuses.includes(invoice.status)) {
    return {
      success: false,
      message: `Non è possibile registrare pagamenti per una fattura in stato "${invoice.status}"`,
    };
  }

  const invoiceTotal = invoice.lines.reduce((sum, line) => {
    const subtotal = Number(line.quantity) * Number(line.unitPrice);
    const tax = subtotal * (Number(line.taxRate.rate) / 100);
    return sum + subtotal + tax;
  }, 0);

  const alreadyPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const remaining = invoiceTotal - alreadyPaid;

  if (amount > remaining + 0.01) {
    return {
      success: false,
      errors: {
        amount: [
          `L'importo supera il saldo rimanente di ${remaining.toFixed(2)}`,
        ],
      },
    };
  }

  const totalAfterPayment = alreadyPaid + amount;
  const isFullyPaid = Math.abs(totalAfterPayment - invoiceTotal) < 0.01;
  const paymentDate = new Date(date);

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId,
        amount: new Decimal(amount),
        date: paymentDate,
        method: method || "",
        notes: notes || "",
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: isFullyPaid ? "pagata" : "parzialmente_pagata",
        ...(isFullyPaid ? { paidAt: paymentDate } : {}),
      },
    }),
  ]);

  return {
    success: true,
    message: isFullyPaid
      ? "Fattura completamente pagata"
      : "Pagamento registrato",
  };
}

// --- Delete payment ---

export async function deletePayment(
  paymentId: string
): Promise<InvoiceActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Non autenticato" };

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { invoiceId: true },
  });

  if (!payment) return { success: false, message: "Pagamento non trovato" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: payment.invoiceId, userId: user.userId },
    include: {
      lines: { include: { taxRate: { select: { rate: true } } } },
      payments: { select: { id: true, amount: true } },
    },
  });

  if (!invoice) return { success: false, message: "Fattura non trovata" };

  const remainingPaid = invoice.payments
    .filter((p) => p.id !== paymentId)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const invoiceTotal = invoice.lines.reduce((sum, line) => {
    const subtotal = Number(line.quantity) * Number(line.unitPrice);
    const tax = subtotal * (Number(line.taxRate.rate) / 100);
    return sum + subtotal + tax;
  }, 0);

  let newStatus: InvoiceStatus;
  if (remainingPaid <= 0.01) {
    newStatus = "emessa";
  } else if (Math.abs(remainingPaid - invoiceTotal) < 0.01) {
    newStatus = "pagata";
  } else {
    newStatus = "parzialmente_pagata";
  }

  await prisma.$transaction([
    prisma.payment.delete({ where: { id: paymentId } }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: newStatus,
        paidAt: newStatus === "pagata" ? invoice.paidAt : null,
      },
    }),
  ]);

  return { success: true, message: "Pagamento eliminato" };
}
