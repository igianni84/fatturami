import { PrismaClient, TaxRateType } from "@prisma/client";

const prisma = new PrismaClient();

const taxRates = [
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
  {
    name: "Inversión sujeto pasivo (intra-UE)",
    rate: 0,
    country: "EU",
    type: TaxRateType.reverse_charge,
  },
  {
    name: "Exportación exenta (extra-UE)",
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
