import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
  type: string;
}

/**
 * Returns tax rates for the user's company country + shared EU/EXTRA-EU rates.
 */
export async function getTaxRatesForCountry(): Promise<TaxRateOption[]> {
  const { userId } = await requireUser();

  const company = await prisma.company.findUnique({
    where: { userId },
    select: { country: true },
  });

  const companyCountry = company?.country || "ES";

  const rates = await prisma.taxRate.findMany({
    where: {
      country: { in: [companyCountry, "EU", "EXTRA-EU"] },
    },
    select: { id: true, name: true, rate: true, type: true },
    orderBy: { rate: "desc" },
  });

  return rates.map((r) => ({
    id: r.id,
    name: r.name,
    rate: Number(r.rate),
    type: r.type,
  }));
}
