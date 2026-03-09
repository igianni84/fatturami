import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { number: "INV-2026-001" },
    select: { id: true, number: true, creditNotes: { select: { id: true } } },
  });

  if (!invoice) {
    console.log("Invoice INV-2026-001 not found");
    return;
  }

  if (invoice.creditNotes.length > 0) {
    console.log("Cannot delete: invoice has credit notes");
    return;
  }

  await prisma.invoice.delete({ where: { id: invoice.id } });
  console.log(`Deleted invoice ${invoice.number} (${invoice.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
