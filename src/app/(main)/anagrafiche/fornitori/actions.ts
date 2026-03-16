"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { ExpenseCategory } from "@prisma/client";
import { getFieldErrors } from "@/lib/utils";

// --- List ---

export interface SupplierListItem {
  id: string;
  name: string;
  vatNumber: string;
  country: string;
  email: string;
  expenseCategory: ExpenseCategory;
}

export interface SupplierListResult {
  suppliers: SupplierListItem[];
  totalCount: number;
}

export async function getSuppliers(
  search: string = "",
  page: number = 1,
  pageSize: number = 10
): Promise<SupplierListResult> {
  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { vatNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [suppliers, totalCount] = await Promise.all([
    prisma.supplier.findMany({
      where,
      select: {
        id: true,
        name: true,
        vatNumber: true,
        country: true,
        email: true,
        expenseCategory: true,
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  return { suppliers, totalCount };
}

// --- Zod schema ---

const VALID_CATEGORIES: string[] = Object.values(ExpenseCategory);

const supplierSchema = z.object({
  name: z.string().min(1, "La ragione sociale è obbligatoria"),
  vatNumber: z.string(),
  address: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string().min(1, "Il paese è obbligatorio"),
  email: z.string().email("Email non valida").or(z.literal("")),
  expenseCategory: z.string().refine(
    (val) => VALID_CATEGORIES.includes(val),
    "Categoria non valida"
  ),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export type SupplierActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// --- Get single supplier ---

export async function getSupplier(id: string): Promise<SupplierFormData | null> {
  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) return null;
  return {
    name: supplier.name,
    vatNumber: supplier.vatNumber,
    address: supplier.address,
    city: supplier.city,
    postalCode: supplier.postalCode,
    country: supplier.country,
    email: supplier.email,
    expenseCategory: supplier.expenseCategory,
  };
}

// --- Create supplier ---

export async function createSupplier(
  data: SupplierFormData
): Promise<SupplierActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  const result = supplierSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: getFieldErrors(result.error),
    };
  }

  await prisma.supplier.create({
    data: {
      ...result.data,
      expenseCategory: result.data.expenseCategory as ExpenseCategory,
    },
  });

  return { success: true, message: "Fornitore creato con successo" };
}

// --- Update supplier ---

export async function updateSupplier(
  id: string,
  data: SupplierFormData
): Promise<SupplierActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  const result = supplierSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: getFieldErrors(result.error),
    };
  }

  await prisma.supplier.update({
    where: { id },
    data: {
      ...result.data,
      expenseCategory: result.data.expenseCategory as ExpenseCategory,
    },
  });

  return { success: true, message: "Fornitore aggiornato con successo" };
}

// --- Delete supplier (soft delete) ---

export async function deleteSupplier(id: string): Promise<SupplierActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { success: true, message: "Fornitore eliminato con successo" };
}
