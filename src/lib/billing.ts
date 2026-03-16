import { prisma } from "@/lib/prisma";

const FREE_INVOICE_LIMIT = 10;

export interface BillingInfo {
  status: "free" | "active" | "past_due" | "canceled";
  emittedCount: number;
  limit: number | null;
  canEmit: boolean;
  currentPeriodEnd: Date | null;
}

export async function getBillingInfo(userId: string): Promise<BillingInfo> {
  const [subscription, emittedCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true },
    }),
    prisma.invoice.count({
      where: { userId, status: { not: "bozza" } },
    }),
  ]);

  const status = subscription?.status ?? "free";

  // Pro (active or past_due) = no limit
  if (status === "active" || status === "past_due") {
    return {
      status,
      emittedCount,
      limit: null,
      canEmit: true,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    };
  }

  // Free or canceled = 10 invoice limit
  return {
    status: status === "canceled" ? "canceled" : "free",
    emittedCount,
    limit: FREE_INVOICE_LIMIT,
    canEmit: emittedCount < FREE_INVOICE_LIMIT,
    currentPeriodEnd: null,
  };
}

export async function canUserEmitInvoice(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });

  const status = subscription?.status ?? "free";

  if (status === "active" || status === "past_due") {
    return true;
  }

  const emittedCount = await prisma.invoice.count({
    where: { userId, status: { not: "bozza" } },
  });

  return emittedCount < FREE_INVOICE_LIMIT;
}
