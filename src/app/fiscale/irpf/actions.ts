"use server";

import { prisma } from "@/lib/prisma";

export interface IRPFReportData {
  year: number;
  quarterlyData: QuarterData[];
  annualSummary: {
    totalRevenue: number;
    totalDeductibleExpenses: number;
    netIncome: number;
    estimatedIRPF: number;
    brackets: BracketBreakdown[];
    totalWithholdings: number;
    totalPagosFraccionados: number;
  };
}

export interface QuarterData {
  quarter: number;
  revenue: number;
  deductibleExpenses: number;
  netIncome: number;
  pagoFraccionado: number;
}

export interface BracketBreakdown {
  from: number;
  to: number | null;
  rate: number;
  taxableInBracket: number;
  tax: number;
}

// Spanish IRPF brackets for 2024
const IRPF_BRACKETS = [
  { from: 0, to: 12450, rate: 19 },
  { from: 12450, to: 20200, rate: 24 },
  { from: 20200, to: 35200, rate: 30 },
  { from: 35200, to: 60000, rate: 37 },
  { from: 60000, to: null as number | null, rate: 45 },
];

function getQuarterRange(year: number, quarter: number): { start: Date; end: Date } {
  const quarterStart = (quarter - 1) * 3;
  return {
    start: new Date(year, quarterStart, 1),
    end: new Date(year, quarterStart + 3, 0, 23, 59, 59, 999),
  };
}

function calculateIRPF(netIncome: number): { total: number; brackets: BracketBreakdown[] } {
  if (netIncome <= 0) {
    return {
      total: 0,
      brackets: IRPF_BRACKETS.map((b) => ({
        from: b.from,
        to: b.to,
        rate: b.rate,
        taxableInBracket: 0,
        tax: 0,
      })),
    };
  }

  let remaining = netIncome;
  let totalTax = 0;
  const brackets: BracketBreakdown[] = [];

  for (const bracket of IRPF_BRACKETS) {
    const bracketSize = bracket.to !== null ? bracket.to - bracket.from : Infinity;
    const taxableInBracket = Math.min(remaining, bracketSize);
    const tax = taxableInBracket * (bracket.rate / 100);

    brackets.push({
      from: bracket.from,
      to: bracket.to,
      rate: bracket.rate,
      taxableInBracket,
      tax,
    });

    totalTax += tax;
    remaining -= taxableInBracket;

    if (remaining <= 0) break;
  }

  // Fill remaining brackets with 0
  for (let i = brackets.length; i < IRPF_BRACKETS.length; i++) {
    brackets.push({
      from: IRPF_BRACKETS[i].from,
      to: IRPF_BRACKETS[i].to,
      rate: IRPF_BRACKETS[i].rate,
      taxableInBracket: 0,
      tax: 0,
    });
  }

  return { total: totalTax, brackets };
}

export async function getIRPFReport(year: number): Promise<IRPFReportData> {
  const quarterlyData: QuarterData[] = [];
  let totalRevenue = 0;
  let totalDeductibleExpenses = 0;
  let totalWithholdings = 0;

  for (let q = 1; q <= 4; q++) {
    const { start, end } = getQuarterRange(year, q);

    // Revenue: all issued invoices (emessa/inviata/pagata) in the quarter
    const invoices = await prisma.invoice.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { in: ["emessa", "inviata", "pagata"] },
      },
      include: {
        lines: { include: { taxRate: true } },
      },
    });

    let quarterRevenue = 0;
    for (const invoice of invoices) {
      for (const line of invoice.lines) {
        quarterRevenue += Number(line.quantity) * Number(line.unitPrice);
      }
    }

    // Deductible expenses: purchase invoices + expenses (deductible only)
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        lines: true,
      },
    });

    let quarterExpenses = 0;
    for (const pi of purchaseInvoices) {
      for (const line of pi.lines) {
        quarterExpenses += Number(line.amount);
      }
    }

    // Regular expenses (deductible only)
    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: start, lte: end },
        deductible: true,
      },
    });

    for (const expense of expenses) {
      quarterExpenses += Number(expense.amount);
    }

    // IRPF withholdings from Spanish clients (if applicable)
    // These are invoices to Spanish clients where IRPF retention was applied
    // For simplicity, we track this but don't compute automatically
    // (Spanish autónomos may apply 15% IRPF retention on invoices to businesses)

    const quarterNetIncome = quarterRevenue - quarterExpenses;
    const pagoFraccionado = Math.max(0, quarterNetIncome * 0.20);

    quarterlyData.push({
      quarter: q,
      revenue: quarterRevenue,
      deductibleExpenses: quarterExpenses,
      netIncome: quarterNetIncome,
      pagoFraccionado,
    });

    totalRevenue += quarterRevenue;
    totalDeductibleExpenses += quarterExpenses;
  }

  const netIncome = totalRevenue - totalDeductibleExpenses;
  const { total: estimatedIRPF, brackets } = calculateIRPF(Math.max(0, netIncome));
  const totalPagosFraccionados = quarterlyData.reduce((sum, q) => sum + q.pagoFraccionado, 0);

  return {
    year,
    quarterlyData,
    annualSummary: {
      totalRevenue,
      totalDeductibleExpenses,
      netIncome,
      estimatedIRPF,
      brackets,
      totalWithholdings,
      totalPagosFraccionados,
    },
  };
}
