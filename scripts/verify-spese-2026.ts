import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  const invoices = await prisma.purchaseInvoice.findMany({
    where: { date: { gte: new Date("2026-01-01"), lt: new Date("2027-01-01") } },
    include: { lines: { include: { taxRate: true } }, supplier: true },
    orderBy: { date: "asc" },
  });

  console.log("=== VERIFICA SPESE 2026 ===\n");

  let totalImponibile = 0;
  let totalIVA = 0;
  let totalDedImponibile = 0;
  let totalDedIVA = 0;

  for (const pi of invoices) {
    let invImponibile = 0;
    let invIVA = 0;
    let dedImponibile = 0;
    let dedIVA = 0;

    for (const line of pi.lines) {
      const amt = Number(line.amount);
      const rate = Number(line.taxRate.rate);
      const iva = amt * rate / 100;
      invImponibile += amt;
      invIVA += iva;
      if (line.deductible) {
        dedImponibile += amt;
        dedIVA += iva;
      }
    }

    const total = invImponibile + invIVA;
    const hasPdf = pi.filePath ? "PDF" : "---";
    const isSplit = pi.lines.some((l) => l.deductible) && pi.lines.some((l) => !l.deductible);
    const dedLabel = isSplit ? "SPLIT" : "100%";

    console.log(
      `${pi.date.toISOString().split("T")[0]} | ${pi.supplier.name.padEnd(30).slice(0, 30)} | ${pi.number.padEnd(25).slice(0, 25)} | Imp: ${invImponibile.toFixed(2).padStart(8)} | IVA: ${invIVA.toFixed(2).padStart(7)} | Tot: ${total.toFixed(2).padStart(8)} | ${dedLabel.padEnd(5)} | ${hasPdf}`
    );

    totalImponibile += invImponibile;
    totalIVA += invIVA;
    totalDedImponibile += dedImponibile;
    totalDedIVA += dedIVA;
  }

  console.log("-".repeat(130));
  console.log(`TOTALE:      Imponibile: ${totalImponibile.toFixed(2)} | IVA: ${totalIVA.toFixed(2)} | Totale: ${(totalImponibile + totalIVA).toFixed(2)}`);
  console.log(`DEDUCIBILE:  Imponibile: ${totalDedImponibile.toFixed(2)} | IVA: ${totalDedIVA.toFixed(2)} | Totale: ${(totalDedImponibile + totalDedIVA).toFixed(2)}`);

  console.log(`\nFatture totali: ${invoices.length}`);
  console.log(`Con PDF allegato: ${invoices.filter((i) => i.filePath).length}`);
  console.log(`Senza PDF: ${invoices.filter((i) => !i.filePath).length}`);

  await prisma.$disconnect();
}

verify();
