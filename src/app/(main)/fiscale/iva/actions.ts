"use server";

import { prisma } from "@/lib/prisma";

export interface VATReportData {
  year: number;
  quarter: number;
  ivaRepercutida: number;
  ivaRepercutidaBase: number;
  ivaSoportadaDeducible: number;
  ivaSoportadaDeducibleBase: number;
  ivaResult: number;
  breakdown: {
    rate: number;
    rateName: string;
    salesBase: number;
    salesTax: number;
    purchasesBase: number;
    purchasesTax: number;
  }[];
  intraEUOperations: {
    clientName: string;
    vatNumber: string;
    country: string;
    invoiceNumber: string;
    date: string;
    amount: number;
  }[];
}

function getQuarterRange(year: number, quarter: number): { start: Date; end: Date } {
  const quarterStart = (quarter - 1) * 3;
  return {
    start: new Date(year, quarterStart, 1),
    end: new Date(year, quarterStart + 3, 0, 23, 59, 59, 999),
  };
}

export async function getVATReport(year: number, quarter: number): Promise<VATReportData> {
  const { start, end } = getQuarterRange(year, quarter);

  // IVA Repercutida: VAT on issued invoices to Spanish (nazionale) clients only
  const domesticInvoices = await prisma.invoice.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { in: ["emessa", "inviata", "pagata"] },
      client: { vatRegime: "nazionale" },
    },
    include: {
      lines: { include: { taxRate: true } },
    },
  });

  // IVA Soportada Deducible: deductible VAT on purchases
  const purchaseInvoices = await prisma.purchaseInvoice.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    include: {
      lines: { include: { taxRate: true } },
    },
  });

  // Intra-EU operations (for Modelo 349 summary)
  const intraEUInvoices = await prisma.invoice.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { in: ["emessa", "inviata", "pagata"] },
      client: { vatRegime: "intraUE" },
    },
    include: {
      client: { select: { name: true, vatNumber: true, country: true } },
      lines: { include: { taxRate: true } },
    },
  });

  // Calculate IVA Repercutida (domestic sales VAT)
  const rateBreakdownMap = new Map<string, {
    rate: number;
    rateName: string;
    salesBase: number;
    salesTax: number;
    purchasesBase: number;
    purchasesTax: number;
  }>();

  let totalSalesBase = 0;
  let totalSalesTax = 0;

  for (const invoice of domesticInvoices) {
    for (const line of invoice.lines) {
      const lineBase = Number(line.quantity) * Number(line.unitPrice);
      const rate = Number(line.taxRate.rate);
      const lineTax = lineBase * (rate / 100);

      totalSalesBase += lineBase;
      totalSalesTax += lineTax;

      const key = line.taxRate.id;
      const existing = rateBreakdownMap.get(key);
      if (existing) {
        existing.salesBase += lineBase;
        existing.salesTax += lineTax;
      } else {
        rateBreakdownMap.set(key, {
          rate,
          rateName: line.taxRate.name,
          salesBase: lineBase,
          salesTax: lineTax,
          purchasesBase: 0,
          purchasesTax: 0,
        });
      }
    }
  }

  // Calculate IVA Soportada Deducible (deductible purchase VAT)
  let totalPurchasesBase = 0;
  let totalPurchasesTax = 0;

  for (const pi of purchaseInvoices) {
    for (const line of pi.lines) {
      if (!line.deductible) continue;

      const lineBase = Number(line.amount);
      const rate = Number(line.taxRate.rate);
      const lineTax = lineBase * (rate / 100);

      totalPurchasesBase += lineBase;
      totalPurchasesTax += lineTax;

      const key = line.taxRate.id;
      const existing = rateBreakdownMap.get(key);
      if (existing) {
        existing.purchasesBase += lineBase;
        existing.purchasesTax += lineTax;
      } else {
        rateBreakdownMap.set(key, {
          rate,
          rateName: line.taxRate.name,
          salesBase: 0,
          salesTax: 0,
          purchasesBase: lineBase,
          purchasesTax: lineTax,
        });
      }
    }
  }

  // Calculate intra-EU operations summary
  const intraEUOperations = intraEUInvoices.map((inv) => {
    const amount = inv.lines.reduce((sum, line) => {
      return sum + Number(line.quantity) * Number(line.unitPrice);
    }, 0);

    return {
      clientName: inv.client.name,
      vatNumber: inv.client.vatNumber,
      country: inv.client.country,
      invoiceNumber: inv.number,
      date: inv.date.toISOString().split("T")[0],
      amount,
    };
  });

  // Sort breakdown by rate descending
  const breakdown = Array.from(rateBreakdownMap.values()).sort(
    (a, b) => b.rate - a.rate
  );

  return {
    year,
    quarter,
    ivaRepercutida: totalSalesTax,
    ivaRepercutidaBase: totalSalesBase,
    ivaSoportadaDeducible: totalPurchasesTax,
    ivaSoportadaDeducibleBase: totalPurchasesBase,
    ivaResult: totalSalesTax - totalPurchasesTax,
    breakdown,
    intraEUOperations,
  };
}
