import { PrismaClient, TaxRateType } from "@prisma/client";

const prisma = new PrismaClient();

const taxRates = [
  // Spanish tax rates
  {
    name: "IVA General 21%",
    rate: 21,
    country: "ES",
    type: TaxRateType.standard,
  },
  {
    name: "IVA Reducido 10%",
    rate: 10,
    country: "ES",
    type: TaxRateType.reduced,
  },
  {
    name: "IVA Superreducido 4%",
    rate: 4,
    country: "ES",
    type: TaxRateType.super_reduced,
  },
  // Italian tax rates
  {
    name: "IVA Ordinaria 22%",
    rate: 22,
    country: "IT",
    type: TaxRateType.standard,
  },
  {
    name: "IVA Ridotta 10%",
    rate: 10,
    country: "IT",
    type: TaxRateType.reduced,
  },
  {
    name: "IVA Minima 5%",
    rate: 5,
    country: "IT",
    type: TaxRateType.minimum,
  },
  {
    name: "IVA Super-ridotta 4%",
    rate: 4,
    country: "IT",
    type: TaxRateType.super_reduced,
  },
  // Shared EU/extra-EU rates
  {
    name: "Inversión sujeto pasivo / Reverse charge (intra-UE)",
    rate: 0,
    country: "EU",
    type: TaxRateType.reverse_charge,
  },
  {
    name: "Exportación exenta / Esportazione esente (extra-UE)",
    rate: 0,
    country: "EXTRA-EU",
    type: TaxRateType.export_exempt,
  },
];

async function main() {
  for (const taxRate of taxRates) {
    await prisma.taxRate.upsert({
      where: {
        id: `seed-${taxRate.type}-${taxRate.country}`,
      },
      update: {
        name: taxRate.name,
        rate: taxRate.rate,
        country: taxRate.country,
        type: taxRate.type,
      },
      create: {
        id: `seed-${taxRate.type}-${taxRate.country}`,
        name: taxRate.name,
        rate: taxRate.rate,
        country: taxRate.country,
        type: taxRate.type,
      },
    });
  }

  console.log("Seed completed: Tax rates created/updated successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
