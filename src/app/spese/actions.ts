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
