"use server";

import { prisma } from "@/lib/prisma";

// --- Types ---

export interface DashboardMetrics {
  revenue: number;
  expenses: number;
  balance: number;
  overdueCount: number;
}

export interface RecentDocument {
  id: string;
  type: "invoice" | "purchase";
  number: string;
  name: string;
  date: string;
  total: number;
  currency: string;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentDocuments: RecentDocument[];
  monthlyRevenue: MonthlyRevenue[];
}

// --- Period date range helper ---

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === "month") {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  if (period === "quarter") {
    const quarterStart = Math.floor(month / 3) * 3;
    return {
      start: new Date(year, quarterStart, 1),
      end: new Date(year, quarterStart + 3, 0, 23, 59, 59, 999),
    };
  }

  // year
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

// --- Get dashboard data ---

export async function getDashboardData(period: string): Promise<DashboardData> {
  const { start, end } = getPeriodRange(period);
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  // Execute all independent queries in parallel
  const [
    invoices,
    purchaseInvoices,
    expenseAggregate,
    overdueCount,
    recentInvoices,
    recentPurchases,
    yearInvoices,
  ] = await Promise.all([
    // Revenue invoices for the period
    prisma.invoice.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { in: ["emessa", "inviata", "parzialmente_pagata", "pagata"] },
      },
      include: { lines: { include: { taxRate: true } } },
    }),
    // Purchase invoices for the period
    prisma.purchaseInvoice.findMany({
      where: { date: { gte: start, lte: end } },
      include: { lines: { include: { taxRate: true } } },
    }),
    // Expense aggregate for the period
    prisma.expense.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true, taxAmount: true },
    }),
    // Overdue invoices count
    prisma.invoice.count({
      where: {
        status: { in: ["emessa", "inviata", "parzialmente_pagata"] },
        dueDate: { lt: new Date() },
      },
    }),
    // Recent invoices
    prisma.invoice.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: {
        client: { select: { name: true } },
        lines: { include: { taxRate: true } },
      },
    }),
    // Recent purchases
    prisma.purchaseInvoice.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: {
        supplier: { select: { name: true } },
        lines: { include: { taxRate: true } },
      },
    }),
    // Year invoices for chart
    prisma.invoice.findMany({
      where: {
        date: { gte: yearStart, lte: yearEnd },
        status: { in: ["emessa", "inviata", "parzialmente_pagata", "pagata"] },
      },
      include: { lines: { include: { taxRate: true } } },
    }),
  ]);

  // Calculate revenue
  const revenue = invoices.reduce((sum, inv) => {
    const invTotal = inv.lines.reduce((lineSum, line) => {
      const lineAmount = Number(line.quantity) * Number(line.unitPrice);
      const tax = lineAmount * (Number(line.taxRate.rate) / 100);
      return lineSum + lineAmount + tax;
    }, 0);
    return sum + invTotal;
  }, 0);

  // Calculate expenses
  const purchaseTotal = purchaseInvoices.reduce((sum, pi) => {
    const piTotal = pi.lines.reduce((lineSum, line) => {
      const lineAmount = Number(line.amount);
      const tax = lineAmount * (Number(line.taxRate.rate) / 100);
      return lineSum + lineAmount + tax;
    }, 0);
    return sum + piTotal;
  }, 0);

  const expenseTotal =
    Number(expenseAggregate._sum.amount || 0) +
    Number(expenseAggregate._sum.taxAmount || 0);

  const expenses = purchaseTotal + expenseTotal;
  const balance = revenue - expenses;

  // Build recent documents
  const recentDocs: RecentDocument[] = [
    ...recentInvoices.map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      number: inv.number,
      name: inv.client.name,
      date: inv.date.toISOString().split("T")[0],
      total: inv.lines.reduce((sum, line) => {
        const lineAmount = Number(line.quantity) * Number(line.unitPrice);
        const tax = lineAmount * (Number(line.taxRate.rate) / 100);
        return sum + lineAmount + tax;
      }, 0),
      currency: inv.currency,
    })),
    ...recentPurchases.map((pi) => ({
      id: pi.id,
      type: "purchase" as const,
      number: pi.number,
      name: pi.supplier.name,
      date: pi.date.toISOString().split("T")[0],
      total: pi.lines.reduce((sum, line) => {
        const lineAmount = Number(line.amount);
        const tax = lineAmount * (Number(line.taxRate.rate) / 100);
        return sum + lineAmount + tax;
      }, 0),
      currency: "EUR",
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Build monthly revenue chart
  const monthNames = [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
  ];

  const monthlyRevenue: MonthlyRevenue[] = monthNames.map((month, index) => {
    const monthRevenue = yearInvoices
      .filter((inv) => inv.date.getMonth() === index)
      .reduce((sum, inv) => {
        const invTotal = inv.lines.reduce((lineSum, line) => {
          const lineAmount = Number(line.quantity) * Number(line.unitPrice);
          const tax = lineAmount * (Number(line.taxRate.rate) / 100);
          return lineSum + lineAmount + tax;
        }, 0);
        return sum + invTotal;
      }, 0);
    return { month, revenue: Math.round(monthRevenue * 100) / 100 };
  });

  return {
    metrics: { revenue, expenses, balance, overdueCount },
    recentDocuments: recentDocs,
    monthlyRevenue,
  };
}
