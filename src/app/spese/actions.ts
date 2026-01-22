"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { ExpenseCategory } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// --- Types ---

export type ExpenseActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  id?: string;
};

// --- Schema ---

const expenseSchema = z.object({
  date: z.string().min(1, "La data è obbligatoria"),
  description: z.string().min(1, "La descrizione è obbligatoria"),
  amount: z.number().positive("L'importo deve essere positivo"),
  category: z.string().min(1, "La categoria è obbligatoria"),
  taxAmount: z.number().min(0, "L'importo IVA non può essere negativo"),
  deductible: z.boolean(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

// --- Upload file ---

async function uploadFile(file: File): Promise<string> {
  const uploadsDir = join(process.cwd(), "uploads", "spese");
  await mkdir(uploadsDir, { recursive: true });

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = join(uploadsDir, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  return `uploads/spese/${fileName}`;
}

// --- Create expense ---

// --- Types for expense list ---

export interface ExpenseListItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  deductible: boolean;
}

export interface ExpenseListResult {
  expenses: ExpenseListItem[];
  totalCount: number;
  totalAmount: number;
}

// --- Fetch expenses with pagination and filters ---

export async function getExpenses(params: {
  page?: number;
  pageSize?: number;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  deductible?: string;
}): Promise<ExpenseListResult> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.category && params.category !== "tutte") {
    where.category = params.category as ExpenseCategory;
  }
  if (params.dateFrom || params.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (params.dateFrom) {
      dateFilter.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      dateFilter.lte = new Date(params.dateTo);
    }
    where.date = dateFilter;
  }
  if (params.deductible === "si") {
    where.deductible = true;
  } else if (params.deductible === "no") {
    where.deductible = false;
  }

  const [expenses, totalCount, totalAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const result: ExpenseListItem[] = expenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString().split("T")[0],
    description: e.description,
    category: e.category,
    amount: Number(e.amount),
    deductible: e.deductible,
  }));

  return {
    expenses: result,
    totalCount,
    totalAmount: Number(totalAgg._sum.amount || 0),
  };
}

// --- Create expense ---

export async function createExpense(
  data: ExpenseFormData,
  file?: File | null
): Promise<ExpenseActionResult> {
  const result = expenseSchema.safeParse(data);

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

  const expense = await prisma.expense.create({
    data: {
      date: new Date(result.data.date),
      description: result.data.description,
      amount: new Decimal(result.data.amount),
      category: result.data.category as ExpenseCategory,
      taxAmount: new Decimal(result.data.taxAmount),
      deductible: result.data.deductible,
      filePath,
    },
  });

  return { success: true, id: expense.id };
}
