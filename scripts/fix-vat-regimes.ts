import { PrismaClient } from "@prisma/client";
import { detectVatRegime } from "../src/lib/vat-regime";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ select: { country: true } });
  const companyCountry = company?.country || "ES";
  console.log(`Company country: ${companyCountry}`);

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, country: true, vatRegime: true },
  });

  console.log(`Found ${clients.length} clients to check\n`);

  let updated = 0;
  let unchanged = 0;

  for (const client of clients) {
    const correctRegime = detectVatRegime(
      client.country || companyCountry,
      companyCountry
    );

    if (client.vatRegime !== correctRegime) {
      await prisma.client.update({
        where: { id: client.id },
        data: { vatRegime: correctRegime },
      });
      console.log(
        `  UPDATED: ${client.name} — ${client.vatRegime} → ${correctRegime} (country: ${client.country})`
      );
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n--- Fix Summary ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
