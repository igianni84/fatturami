"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { ExpenseCategory, PurchaseInvoiceStatus, Prisma } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// --- Types ---

export interface SupplierOption {
  id: string;
  name: string;
  expenseCategory: ExpenseCategory;
}

export interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

export type PurchaseInvoiceActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  id?: string;
};

// --- Line item schema ---

const lineSchema = z.object({
  description: z.string().min(1, "La descrizione è obbligatoria"),
  amount: z.number().positive("L'importo deve essere positivo"),
  taxRateId: z.string().min(1, "L'aliquota IVA è obbligatoria"),
  deductible: z.boolean(),
});

const purchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Il fornitore è obbligatorio"),
  number: z.string().min(1, "Il numero fattura è obbligatorio"),
  date: z.string().min(1, "La data è obbligatoria"),
  category: z.string().min(1, "La categoria è obbligatoria"),
  notes: z.string(),
  lines: z.array(lineSchema).min(1, "Inserire almeno una riga"),
});

export type PurchaseInvoiceFormData = z.infer<typeof purchaseInvoiceSchema>;

// --- Fetch suppliers for dropdown ---

export async function getSuppliersForSelect(): Promise<SupplierOption[]> {
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, expenseCategory: true },
    orderBy: { name: "asc" },
  });
  return suppliers;
}

// --- Fetch tax rates ---

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

// --- Upload file ---

async function uploadFile(file: File): Promise<string> {
  const uploadsDir = join(process.cwd(), "uploads", "acquisti");
  await mkdir(uploadsDir, { recursive: true });

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = join(uploadsDir, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  return `uploads/acquisti/${fileName}`;
}

// --- Create purchase invoice ---

export async function createPurchaseInvoice(
  data: PurchaseInvoiceFormData,
  file?: File | null
): Promise<PurchaseInvoiceActionResult> {
  const result = purchaseInvoiceSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Validate category
  const validCategories = Object.values(ExpenseCategory);
  if (!validCategories.includes(result.data.category as ExpenseCategory)) {
    return {
      success: false,
      errors: { category: ["Categoria non valida"] },
    };
  }

  let filePath: string | null = null;
  if (file && file.size > 0) {
    filePath = await uploadFile(file);
  }

  const purchaseInvoice = await prisma.purchaseInvoice.create({
    data: {
      supplierId: result.data.supplierId,
      number: result.data.number,
      date: new Date(result.data.date),
      category: result.data.category as ExpenseCategory,
      status: PurchaseInvoiceStatus.registrata,
      filePath,
      notes: result.data.notes || "",
      lines: {
        create: result.data.lines.map((line) => ({
          description: line.description,
          amount: new Decimal(line.amount),
          taxRateId: line.taxRateId,
          deductible: line.deductible,
        })),
      },
    },
  });

  return { success: true, id: purchaseInvoice.id };
}

// --- Types for purchase invoice list ---

export interface PurchaseInvoiceListItem {
  id: string;
  supplierName: string;
  number: string;
  date: string;
  category: string;
  total: number;
  status: string;
}

export interface PurchaseInvoiceListResult {
  purchaseInvoices: PurchaseInvoiceListItem[];
  totalCount: number;
}

// --- Fetch purchase invoices with pagination and filters ---

export async function getPurchaseInvoices(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  supplierId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PurchaseInvoiceListResult> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const where: Prisma.PurchaseInvoiceWhereInput = {};

  if (params.status && params.status !== "tutti") {
    where.status = params.status as PurchaseInvoiceStatus;
  }
  if (params.supplierId) {
    where.supplierId = params.supplierId;
  }
  if (params.category && params.category !== "tutte") {
    where.category = params.category as ExpenseCategory;
  }
  if (params.dateFrom || params.dateTo) {
    where.date = {};
    if (params.dateFrom) {
      where.date.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      where.date.lte = new Date(params.dateTo);
    }
  }

  const [purchaseInvoices, totalCount] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
      include: {
        supplier: { select: { name: true } },
        lines: {
          include: { taxRate: { select: { rate: true } } },
        },
      },
    }),
    prisma.purchaseInvoice.count({ where }),
  ]);

  const result: PurchaseInvoiceListItem[] = purchaseInvoices.map((pi) => {
    const total = pi.lines.reduce((sum, line) => {
      const amount = Number(line.amount);
      const tax = amount * (Number(line.taxRate.rate) / 100);
      return sum + amount + tax;
    }, 0);

    return {
      id: pi.id,
      supplierName: pi.supplier.name,
      number: pi.number,
      date: pi.date.toISOString().split("T")[0],
      category: pi.category,
      total,
      status: pi.status,
    };
  });

  return { purchaseInvoices: result, totalCount };
}

// --- Update purchase invoice status ---

export async function updatePurchaseInvoiceStatus(
  id: string,
  newStatus: string
): Promise<PurchaseInvoiceActionResult> {
  const validStatuses: string[] = Object.values(PurchaseInvoiceStatus);
  if (!validStatuses.includes(newStatus)) {
    return { success: false, message: "Stato non valido" };
  }

  await prisma.purchaseInvoice.update({
    where: { id },
    data: { status: newStatus as PurchaseInvoiceStatus },
  });

  return { success: true };
}
