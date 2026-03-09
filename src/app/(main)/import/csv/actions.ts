"use server";

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { VatRegime, InvoiceStatus, PurchaseInvoiceStatus, ExpenseCategory } from "@prisma/client";
import { detectVatRegime } from "@/lib/vat-regime";
import { getCompanyCountry } from "@/app/(main)/impostazioni/actions";

// Types for CSV import

export type ImportType = "issued" | "received";

export type FieldMapping = {
  [systemField: string]: string; // systemField -> csvColumn
};

export type ValidationError = {
  row: number;
  field: string;
  message: string;
};

export type ImportResult = {
  success: boolean;
  importedCount: number;
  errors: ValidationError[];
  createdClients?: number;
  createdSuppliers?: number;
};

// System fields for issued invoices
export const ISSUED_FIELDS = [
  { key: "clientName", label: "Nome Cliente", required: true },
  { key: "clientVatNumber", label: "P.IVA/VAT Cliente", required: false },
  { key: "clientCountry", label: "Paese Cliente", required: false },
  { key: "invoiceNumber", label: "Numero Fattura", required: true },
  { key: "date", label: "Data", required: true },
  { key: "dueDate", label: "Data Scadenza", required: false },
  { key: "description", label: "Descrizione Riga", required: true },
  { key: "quantity", label: "Quantità", required: false },
  { key: "unitPrice", label: "Prezzo Unitario", required: false },
  { key: "amount", label: "Importo Riga", required: false },
  { key: "taxRate", label: "Aliquota IVA (%)", required: false },
  { key: "currency", label: "Valuta", required: false },
  { key: "notes", label: "Note", required: false },
] as const;

// System fields for received invoices (purchase invoices)
export const RECEIVED_FIELDS = [
  { key: "supplierName", label: "Nome Fornitore", required: true },
  { key: "supplierVatNumber", label: "P.IVA/VAT Fornitore", required: false },
  { key: "supplierCountry", label: "Paese Fornitore", required: false },
  { key: "invoiceNumber", label: "Numero Fattura", required: true },
  { key: "date", label: "Data", required: true },
  { key: "description", label: "Descrizione Riga", required: true },
  { key: "amount", label: "Importo", required: true },
  { key: "taxRate", label: "Aliquota IVA (%)", required: false },
  { key: "category", label: "Categoria Spesa", required: false },
  { key: "deductible", label: "IVA Deducibile", required: false },
  { key: "notes", label: "Note", required: false },
] as const;

type ParsedRow = Record<string, string>;

function parseDate(value: string): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  // Try ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const euMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (euMatch) {
    const d = new Date(Number(euMatch[3]), Number(euMatch[2]) - 1, Number(euMatch[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try MM/DD/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    if (month > 12 && day <= 12) {
      // Swap - it's DD/MM/YYYY (already handled above)
    }
  }

  // Fallback: try native Date parsing
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

function parseNumber(value: string): number | null {
  if (!value || !value.trim()) return null;
  // Handle comma as decimal separator
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function findTaxRateId(taxRates: { id: string; rate: number; type: string }[], rate: number): string | null {
  const match = taxRates.find((tr) => Math.abs(tr.rate - rate) < 0.5);
  return match ? match.id : null;
}

async function findOrCreateClient(
  name: string,
  vatNumber: string,
  country: string,
  createdClientsMap: Map<string, string>,
  companyCountry: string
): Promise<string> {
  const key = `${name.toLowerCase().trim()}|${vatNumber.toLowerCase().trim()}`;

  if (createdClientsMap.has(key)) {
    return createdClientsMap.get(key)!;
  }

  // Try to find existing client by name or VAT number
  let existing = null;
  if (vatNumber) {
    existing = await prisma.client.findFirst({
      where: {
        vatNumber: { contains: vatNumber.trim() },
        deletedAt: null,
      },
    });
  }
  if (!existing) {
    existing = await prisma.client.findFirst({
      where: {
        name: { equals: name.trim() },
        deletedAt: null,
      },
    });
  }

  if (existing) {
    createdClientsMap.set(key, existing.id);
    return existing.id;
  }

  // Create new client
  const vatRegime = country ? detectVatRegime(country, companyCountry) : "nazionale";
  const newClient = await prisma.client.create({
    data: {
      name: name.trim(),
      vatNumber: vatNumber?.trim() || "",
      country: country?.trim() || "ES",
      vatRegime,
    },
  });

  createdClientsMap.set(key, newClient.id);
  return newClient.id;
}

async function findOrCreateSupplier(
  name: string,
  vatNumber: string,
  country: string,
  createdSuppliersMap: Map<string, string>
): Promise<string> {
  const key = `${name.toLowerCase().trim()}|${vatNumber.toLowerCase().trim()}`;

  if (createdSuppliersMap.has(key)) {
    return createdSuppliersMap.get(key)!;
  }

  // Try to find existing supplier by name or VAT number
  let existing = null;
  if (vatNumber) {
    existing = await prisma.supplier.findFirst({
      where: {
        vatNumber: { contains: vatNumber.trim() },
        deletedAt: null,
      },
    });
  }
  if (!existing) {
    existing = await prisma.supplier.findFirst({
      where: {
        name: { equals: name.trim() },
        deletedAt: null,
      },
    });
  }

  if (existing) {
    createdSuppliersMap.set(key, existing.id);
    return existing.id;
  }

  // Create new supplier
  const newSupplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      vatNumber: vatNumber?.trim() || "",
      country: country?.trim() || "",
    },
  });

  createdSuppliersMap.set(key, newSupplier.id);
  return newSupplier.id;
}

function generateDisclaimer(vatRegime: VatRegime): string {
  switch (vatRegime) {
    case "intraUE":
      return "Operazione in reverse charge ai sensi dell'art. 196 Direttiva 2006/112/CE";
    case "extraUE":
      return "Operazione non soggetta a IVA ai sensi dell'art. 21 Ley 37/1992";
    default:
      return "Factura sujeta a IVA conforme al artículo 164 de la Ley 37/1992";
  }
}

export async function importCSV(
  rows: ParsedRow[],
  mapping: FieldMapping,
  importType: ImportType
): Promise<ImportResult> {
  const errors: ValidationError[] = [];

  const companyCountry = await getCompanyCountry();

  // Load tax rates
  const taxRatesRaw = await prisma.taxRate.findMany();
  const taxRates = taxRatesRaw.map((tr) => ({
    id: tr.id,
    rate: Number(tr.rate),
    type: tr.type,
  }));

  // Default tax rate (21% standard)
  const defaultTaxRate = taxRates.find((tr) => tr.type === "standard" && tr.rate === 21);
  const defaultTaxRateId = defaultTaxRate?.id || taxRates[0]?.id;

  if (!defaultTaxRateId) {
    return {
      success: false,
      importedCount: 0,
      errors: [{ row: 0, field: "", message: "Nessuna aliquota IVA trovata nel sistema. Eseguire il seed del database." }],
    };
  }

  function getMapped(row: ParsedRow, field: string): string {
    const csvCol = mapping[field];
    if (!csvCol) return "";
    return row[csvCol]?.trim() || "";
  }

  // Validate all rows first
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for 1-based + header row

    if (importType === "issued") {
      if (!getMapped(row, "clientName")) {
        errors.push({ row: rowNum, field: "clientName", message: "Nome cliente obbligatorio" });
      }
      if (!getMapped(row, "invoiceNumber")) {
        errors.push({ row: rowNum, field: "invoiceNumber", message: "Numero fattura obbligatorio" });
      }
      if (!getMapped(row, "date")) {
        errors.push({ row: rowNum, field: "date", message: "Data obbligatoria" });
      } else if (!parseDate(getMapped(row, "date"))) {
        errors.push({ row: rowNum, field: "date", message: "Formato data non valido" });
      }
      if (!getMapped(row, "description")) {
        errors.push({ row: rowNum, field: "description", message: "Descrizione riga obbligatoria" });
      }
      const amount = getMapped(row, "amount");
      const unitPrice = getMapped(row, "unitPrice");
      if (amount && parseNumber(amount) === null) {
        errors.push({ row: rowNum, field: "amount", message: "Importo non valido" });
      }
      if (unitPrice && parseNumber(unitPrice) === null) {
        errors.push({ row: rowNum, field: "unitPrice", message: "Prezzo unitario non valido" });
      }
      if (!amount && !unitPrice) {
        errors.push({ row: rowNum, field: "amount", message: "Importo o prezzo unitario obbligatorio" });
      }
    } else {
      if (!getMapped(row, "supplierName")) {
        errors.push({ row: rowNum, field: "supplierName", message: "Nome fornitore obbligatorio" });
      }
      if (!getMapped(row, "invoiceNumber")) {
        errors.push({ row: rowNum, field: "invoiceNumber", message: "Numero fattura obbligatorio" });
      }
      if (!getMapped(row, "date")) {
        errors.push({ row: rowNum, field: "date", message: "Data obbligatoria" });
      } else if (!parseDate(getMapped(row, "date"))) {
        errors.push({ row: rowNum, field: "date", message: "Formato data non valido" });
      }
      if (!getMapped(row, "description")) {
        errors.push({ row: rowNum, field: "description", message: "Descrizione obbligatoria" });
      }
      const amount = getMapped(row, "amount");
      if (!amount) {
        errors.push({ row: rowNum, field: "amount", message: "Importo obbligatorio" });
      } else if (parseNumber(amount) === null) {
        errors.push({ row: rowNum, field: "amount", message: "Importo non valido" });
      }
    }

    const taxRateVal = getMapped(row, "taxRate");
    if (taxRateVal && parseNumber(taxRateVal) === null) {
      errors.push({ row: rowNum, field: "taxRate", message: "Aliquota IVA non valida" });
    }
  }

  if (errors.length > 0) {
    return { success: false, importedCount: 0, errors };
  }

  // Group rows by invoice number for issued invoices (multiple lines per invoice)
  let importedCount = 0;
  const createdClientsMap = new Map<string, string>();
  const createdSuppliersMap = new Map<string, string>();

  if (importType === "issued") {
    // Group by invoice number
    const invoiceGroups = new Map<string, ParsedRow[]>();
    for (const row of rows) {
      const invoiceNum = getMapped(row, "invoiceNumber");
      if (!invoiceGroups.has(invoiceNum)) {
        invoiceGroups.set(invoiceNum, []);
      }
      invoiceGroups.get(invoiceNum)!.push(row);
    }

    for (const [invoiceNumber, invoiceRows] of invoiceGroups) {
      const firstRow = invoiceRows[0];
      const clientName = getMapped(firstRow, "clientName");
      const clientVat = getMapped(firstRow, "clientVatNumber");
      const clientCountry = getMapped(firstRow, "clientCountry");
      const currency = getMapped(firstRow, "currency") || "EUR";
      const notes = getMapped(firstRow, "notes");
      const dateStr = getMapped(firstRow, "date");
      const dueDateStr = getMapped(firstRow, "dueDate");

      const date = parseDate(dateStr)!;
      const dueDate = dueDateStr ? parseDate(dueDateStr) : null;

      // Find or create client
      const clientId = await findOrCreateClient(clientName, clientVat, clientCountry, createdClientsMap, companyCountry);

      // Get client's VAT regime for disclaimer
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      const vatRegime = client?.vatRegime || "nazionale";
      const disclaimer = generateDisclaimer(vatRegime);

      // Build lines
      const lines = invoiceRows.map((row) => {
        const desc = getMapped(row, "description");
        const qty = parseNumber(getMapped(row, "quantity")) || 1;
        const amountVal = parseNumber(getMapped(row, "amount"));
        const unitPriceVal = parseNumber(getMapped(row, "unitPrice"));
        const price = unitPriceVal ?? (amountVal ? amountVal / qty : 0);
        const taxRateVal = parseNumber(getMapped(row, "taxRate"));
        const taxRateId = taxRateVal !== null ? (findTaxRateId(taxRates, taxRateVal) || defaultTaxRateId) : defaultTaxRateId;

        return {
          description: desc,
          quantity: new Decimal(qty),
          unitPrice: new Decimal(price),
          taxRateId,
        };
      });

      // Check for duplicate invoice number
      const existingInvoice = await prisma.invoice.findUnique({
        where: { number: invoiceNumber },
      });

      if (existingInvoice) {
        // Skip duplicates - add to errors but continue
        const rowIdx = rows.indexOf(firstRow);
        errors.push({
          row: rowIdx + 2,
          field: "invoiceNumber",
          message: `Fattura ${invoiceNumber} già esistente, saltata`,
        });
        continue;
      }

      await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          clientId,
          date,
          dueDate,
          status: "emessa" as InvoiceStatus,
          currency: currency.toUpperCase(),
          exchangeRate: new Decimal(1),
          disclaimer,
          notes: notes || "",
          lines: {
            create: lines,
          },
        },
      });

      importedCount++;
    }
  } else {
    // Received invoices - group by supplier + invoice number
    const purchaseGroups = new Map<string, ParsedRow[]>();
    for (const row of rows) {
      const key = `${getMapped(row, "supplierName")}|${getMapped(row, "invoiceNumber")}`;
      if (!purchaseGroups.has(key)) {
        purchaseGroups.set(key, []);
      }
      purchaseGroups.get(key)!.push(row);
    }

    for (const [, groupRows] of purchaseGroups) {
      const firstRow = groupRows[0];
      const supplierName = getMapped(firstRow, "supplierName");
      const supplierVat = getMapped(firstRow, "supplierVatNumber");
      const supplierCountry = getMapped(firstRow, "supplierCountry");
      const invoiceNumber = getMapped(firstRow, "invoiceNumber");
      const dateStr = getMapped(firstRow, "date");
      const notes = getMapped(firstRow, "notes");
      const categoryStr = getMapped(firstRow, "category");

      const date = parseDate(dateStr)!;

      // Find or create supplier
      const supplierId = await findOrCreateSupplier(supplierName, supplierVat, supplierCountry, createdSuppliersMap);

      // Determine category
      const validCategories = Object.values(ExpenseCategory) as string[];
      const category = validCategories.includes(categoryStr)
        ? (categoryStr as ExpenseCategory)
        : ("altro" as ExpenseCategory);

      // Build lines
      const lines = groupRows.map((row) => {
        const desc = getMapped(row, "description");
        const amountVal = parseNumber(getMapped(row, "amount")) || 0;
        const taxRateVal = parseNumber(getMapped(row, "taxRate"));
        const taxRateId = taxRateVal !== null ? (findTaxRateId(taxRates, taxRateVal) || defaultTaxRateId) : defaultTaxRateId;
        const deductibleStr = getMapped(row, "deductible").toLowerCase();
        const deductible = deductibleStr === "no" || deductibleStr === "false" || deductibleStr === "0" ? false : true;

        return {
          description: desc,
          amount: new Decimal(amountVal),
          taxRateId,
          deductible,
        };
      });

      // Check for duplicate
      const existingPurchase = await prisma.purchaseInvoice.findFirst({
        where: {
          supplierId,
          number: invoiceNumber,
        },
      });

      if (existingPurchase) {
        const rowIdx = rows.indexOf(firstRow);
        errors.push({
          row: rowIdx + 2,
          field: "invoiceNumber",
          message: `Fattura acquisto ${invoiceNumber} da ${supplierName} già esistente, saltata`,
        });
        continue;
      }

      await prisma.purchaseInvoice.create({
        data: {
          supplierId,
          number: invoiceNumber,
          date,
          category,
          status: "registrata" as PurchaseInvoiceStatus,
          notes: notes || "",
          lines: {
            create: lines,
          },
        },
      });

      importedCount++;
    }
  }

  const newClientsCount = [...createdClientsMap.values()].length;
  const newSuppliersCount = [...createdSuppliersMap.values()].length;

  // Count only newly created (not found-existing) by checking original creation
  return {
    success: true,
    importedCount,
    errors,
    createdClients: importType === "issued" ? newClientsCount : undefined,
    createdSuppliers: importType === "received" ? newSuppliersCount : undefined,
  };
}
