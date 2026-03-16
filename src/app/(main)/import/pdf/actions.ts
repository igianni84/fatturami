"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { PurchaseInvoiceStatus, ExpenseCategory } from "@prisma/client";

export interface ReviewItem {
  fileIndex: number;
  fileName: string;
  supplierName: string;
  supplierVatNumber: string;
  invoiceNumber: string;
  date: string;
  category: string;
  matchedSupplierId: string;
  matchedSupplierName: string;
  lines: ReviewLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface ReviewLineItem {
  description: string;
  amount: number;
  taxRate: number;
  deductible: boolean;
}

export interface ImportPDFResult {
  success: boolean;
  importedCount: number;
  errors: { fileIndex: number; fileName: string; message: string }[];
  createdSuppliers: number;
}

export async function importPDFBatch(items: ReviewItem[]): Promise<ImportPDFResult> {
  const { userId } = await requireUser();
  const errors: { fileIndex: number; fileName: string; message: string }[] = [];
  let importedCount = 0;
  const createdSuppliersMap = new Map<string, string>();

  // Load tax rates
  const taxRatesRaw = await prisma.taxRate.findMany();
  const taxRates = taxRatesRaw.map((tr) => ({
    id: tr.id,
    rate: Number(tr.rate),
    type: tr.type,
  }));

  const defaultTaxRate = taxRates.find((tr) => tr.type === "standard" && tr.rate === 21);
  const defaultTaxRateId = defaultTaxRate?.id || taxRates[0]?.id;

  if (!defaultTaxRateId) {
    return {
      success: false,
      importedCount: 0,
      errors: [{ fileIndex: -1, fileName: "", message: "Nessuna aliquota IVA trovata nel sistema." }],
      createdSuppliers: 0,
    };
  }

  for (const item of items) {
    try {
      // Validate required fields
      if (!item.supplierName && !item.matchedSupplierId) {
        errors.push({ fileIndex: item.fileIndex, fileName: item.fileName, message: "Nome fornitore mancante" });
        continue;
      }
      if (!item.date) {
        errors.push({ fileIndex: item.fileIndex, fileName: item.fileName, message: "Data mancante" });
        continue;
      }

      // Find or create supplier
      let supplierId = item.matchedSupplierId;
      if (!supplierId) {
        const key = `${item.supplierName.toLowerCase().trim()}|${(item.supplierVatNumber || "").toLowerCase().trim()}`;
        if (createdSuppliersMap.has(key)) {
          supplierId = createdSuppliersMap.get(key)!;
        } else {
          // Try to find by VAT or name
          let existing = null;
          if (item.supplierVatNumber) {
            existing = await prisma.supplier.findFirst({
              where: {
                userId,
                vatNumber: { contains: item.supplierVatNumber.trim() },
                deletedAt: null,
              },
            });
          }
          if (!existing && item.supplierName) {
            existing = await prisma.supplier.findFirst({
              where: {
                userId,
                name: { equals: item.supplierName.trim() },
                deletedAt: null,
              },
            });
          }

          if (existing) {
            supplierId = existing.id;
          } else {
            const newSupplier = await prisma.supplier.create({
              data: {
                userId,
                name: item.supplierName.trim(),
                vatNumber: item.supplierVatNumber?.trim() || "",
                country: "",
              },
            });
            supplierId = newSupplier.id;
          }
          createdSuppliersMap.set(key, supplierId);
        }
      }

      // Determine category
      const validCategories = Object.values(ExpenseCategory) as string[];
      const category = validCategories.includes(item.category)
        ? (item.category as ExpenseCategory)
        : ("altro" as ExpenseCategory);

      // Build lines
      const lines = item.lines.map((line) => {
        const taxRateId = findTaxRateId(taxRates, line.taxRate) || defaultTaxRateId;
        return {
          description: line.description || "Voce fattura",
          amount: new Decimal(line.amount || 0),
          taxRateId,
          deductible: line.deductible,
        };
      });

      // If no lines, create one from totals
      if (lines.length === 0) {
        lines.push({
          description: "Importo totale",
          amount: new Decimal(item.subtotal || item.total || 0),
          taxRateId: defaultTaxRateId,
          deductible: true,
        });
      }

      const invoiceNumber = item.invoiceNumber || `PDF-${Date.now()}-${item.fileIndex}`;
      const date = new Date(item.date);

      if (isNaN(date.getTime())) {
        errors.push({ fileIndex: item.fileIndex, fileName: item.fileName, message: "Data non valida" });
        continue;
      }

      // Check for duplicates
      if (item.invoiceNumber) {
        const existing = await prisma.purchaseInvoice.findFirst({
          where: { userId, supplierId, number: invoiceNumber },
        });
        if (existing) {
          errors.push({
            fileIndex: item.fileIndex,
            fileName: item.fileName,
            message: `Fattura ${invoiceNumber} già esistente per questo fornitore`,
          });
          continue;
        }
      }

      await prisma.purchaseInvoice.create({
        data: {
          userId,
          supplierId,
          number: invoiceNumber,
          date,
          category,
          status: "registrata" as PurchaseInvoiceStatus,
          notes: `Importato da PDF: ${item.fileName}`,
          lines: {
            create: lines,
          },
        },
      });

      importedCount++;
    } catch (err) {
      errors.push({
        fileIndex: item.fileIndex,
        fileName: item.fileName,
        message: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    }
  }

  return {
    success: importedCount > 0 || errors.length === 0,
    importedCount,
    errors,
    createdSuppliers: createdSuppliersMap.size,
  };
}

function findTaxRateId(taxRates: { id: string; rate: number; type: string }[], rate: number): string | null {
  const match = taxRates.find((tr) => Math.abs(tr.rate - rate) < 0.5);
  return match ? match.id : null;
}
