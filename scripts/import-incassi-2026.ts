import { PrismaClient, VatRegime, TaxRateType, InvoiceStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("=== IMPORT INCASSI 2026 ===\n");

  // Get the first user (single-tenant import script)
  const user = await prisma.user.findFirstOrThrow();
  console.log(`Using user: ${user.email} (${user.id})\n`);

  // --- 1. Create IVA 22% tax rate if not exists ---
  console.log("1. Checking/creating IVA 22% tax rate...");
  const iva22Id = "seed-standard-IT-22";
  await prisma.taxRate.upsert({
    where: { id: iva22Id },
    update: {
      name: "IVA 22% (Italia)",
      rate: 22,
      country: "IT",
      type: TaxRateType.standard,
    },
    create: {
      id: iva22Id,
      name: "IVA 22% (Italia)",
      rate: 22,
      country: "IT",
      type: TaxRateType.standard,
    },
  });
  console.log("   -> IVA 22% OK\n");

  // --- 2. Create missing clients ---
  console.log("2. Creating missing clients...\n");

  // Crurated Limited (GB - extraUE)
  let crurated = await prisma.client.findFirst({
    where: { name: { contains: "Crurated" }, deletedAt: null },
  });
  if (!crurated) {
    crurated = await prisma.client.create({
      data: {
        userId: user.id,
        name: "Crurated Limited",
        vatNumber: "376832951",
        fiscalCode: "",
        address: "24, Fitzroy Square",
        city: "London",
        postalCode: "W1T 6EP",
        country: "GB",
        email: "",
        currency: "EUR",
        vatRegime: VatRegime.extraUE,
        notes: "VAT: GB 376832951",
      },
    });
    console.log(`   -> Crurated Limited CREATO (id: ${crurated.id})`);
  } else {
    console.log(`   -> Crurated Limited gia' presente (id: ${crurated.id})`);
  }

  // Innovedge s.r.l. (IT - intraUE con P.IVA VIES)
  let innovedge = await prisma.client.findFirst({
    where: { name: { contains: "Innovedge" }, deletedAt: null },
  });
  if (!innovedge) {
    innovedge = await prisma.client.create({
      data: {
        userId: user.id,
        name: "Innovedge s.r.l.",
        vatNumber: "10596591213",
        fiscalCode: "",
        address: "Via Giosue' Carducci, 21",
        city: "Pomigliano d'Arco (NA)",
        postalCode: "80038",
        country: "IT",
        email: "info@innovedge.it",
        currency: "EUR",
        vatRegime: VatRegime.intraUE,
        notes: "P.IVA: IT10596591213 - Iscritto VIES (reverse charge)",
      },
    });
    console.log(`   -> Innovedge s.r.l. CREATO (id: ${innovedge.id})`);
  } else {
    console.log(`   -> Innovedge s.r.l. gia' presente (id: ${innovedge.id})`);
  }

  // Lookup existing clients
  const centerHealth = await prisma.client.findFirst({
    where: { name: { contains: "Center Health Tooth" }, deletedAt: null },
  });
  const tenuta = await prisma.client.findFirst({
    where: { name: { contains: "Tenuta Ariello" }, deletedAt: null },
  });
  const barberia = await prisma.client.findFirst({
    where: { name: { contains: "Barberia 95" }, deletedAt: null },
  });

  if (!centerHealth) throw new Error("Center Health Tooth non trovato nel DB!");
  if (!tenuta) throw new Error("Tenuta Ariello non trovata nel DB!");
  if (!barberia) throw new Error("Barberia 95 non trovata nel DB!");

  console.log(`   -> Center Health Tooth OK (id: ${centerHealth.id})`);
  console.log(`   -> Tenuta Ariello OK (id: ${tenuta.id})`);
  console.log(`   -> Barberia 95 OK (id: ${barberia.id})\n`);

  // --- 3. Tax rate IDs ---
  const TAX_EXPORT_EXEMPT = "seed-export_exempt-EXTRA-EU"; // 0% extra-UE (Crurated)
  const TAX_IVA_22 = "seed-standard-IT-22"; // 22% IVA Italia
  const TAX_REVERSE_CHARGE = "seed-reverse_charge-EU"; // 0% reverse charge intra-UE (Innovedge)
  const TAX_IVA_21 = "seed-standard-ES"; // 21% IVA Spagna

  // --- 4. Import invoices ---
  console.log("3. Importing 7 invoices...\n");

  const invoices = [
    {
      number: "FTT-2026-001",
      clientId: crurated.id,
      date: new Date("2026-01-03"),
      dueDate: new Date("2026-02-02"),
      status: InvoiceStatus.pagata,
      disclaimer: "Operacion no sujeta a IVA - Art. 69.Uno.1 Ley 37/1992",
      notes: "Consultancy December 2025. Pagata il 05/01/2026.",
      lines: [
        {
          description: "Consultancy December 2025 - Digital consulting services",
          quantity: new Decimal(1),
          unitPrice: new Decimal(6666),
          taxRateId: TAX_EXPORT_EXEMPT,
        },
      ],
    },
    {
      number: "FTT-2026-002",
      clientId: centerHealth.id,
      date: new Date("2026-01-07"),
      dueDate: new Date("2026-02-06"),
      status: InvoiceStatus.pagata,
      disclaimer: "Operacion sujeta a IVA - Art. 90 Ley 37/1992 del IVA",
      notes: "Rinnovo server e dominio 2026 studiodentisticopalumbo.it. Pagata il 12/01/2026.",
      lines: [
        {
          description: "Rinnovo server e dominio 2026 - studiodentisticopalumbo.it",
          quantity: new Decimal(1),
          unitPrice: new Decimal(120),
          taxRateId: TAX_IVA_22,
        },
      ],
    },
    {
      number: "FTT-2026-003",
      clientId: crurated.id,
      date: new Date("2026-01-26"),
      dueDate: new Date("2026-02-25"),
      status: InvoiceStatus.pagata,
      disclaimer: "Operacion no sujeta a IVA - Art. 69.Uno.1 Ley 37/1992",
      notes: "Consultancy January 2026.",
      lines: [
        {
          description: "Consultancy January 2026 - Digital consulting services",
          quantity: new Decimal(1),
          unitPrice: new Decimal(6666),
          taxRateId: TAX_EXPORT_EXEMPT,
        },
      ],
    },
    {
      number: "FTT-2026-004",
      clientId: tenuta.id,
      date: new Date("2026-01-26"),
      dueDate: new Date("2026-02-25"),
      status: InvoiceStatus.pagata,
      disclaimer: "Operazione soggetta a IVA - Servizio prestato a cliente italiano non iscritto al VIES",
      notes: "Rinnovo dominio, email e server 2026 per sannionatura.it e tenutaariello.it.",
      lines: [
        {
          description: "Rinnovo dominio, email e server 2026 - sannionatura.it",
          quantity: new Decimal(1),
          unitPrice: new Decimal(120),
          taxRateId: TAX_IVA_22,
        },
        {
          description: "Rinnovo dominio, email e server 2026 - tenutaariello.it",
          quantity: new Decimal(1),
          unitPrice: new Decimal(120),
          taxRateId: TAX_IVA_22,
        },
      ],
    },
    {
      number: "FTT-2026-005",
      clientId: innovedge.id,
      date: new Date("2026-02-10"),
      dueDate: new Date("2026-03-12"),
      status: InvoiceStatus.pagata,
      disclaimer: "Operazione intracomunitaria - Inversione contabile (Reverse charge) - Art. 44 e 196 Direttiva 2006/112/CE",
      notes: "Canone rinnovo server.",
      lines: [
        {
          description: "Canone rinnovo server",
          quantity: new Decimal(1),
          unitPrice: new Decimal(800),
          taxRateId: TAX_REVERSE_CHARGE,
        },
      ],
    },
    {
      number: "FTT-2026-006",
      clientId: barberia.id,
      date: new Date("2026-02-04"),
      dueDate: new Date("2026-03-06"),
      status: InvoiceStatus.pagata,
      disclaimer: "Operacion sujeta a IVA espanol - Art. 69.Uno.1 y Art. 70.Uno.1 Ley 37/1992",
      notes: "Canone rinnovo server e dominio 2026 barberia95.it.",
      lines: [
        {
          description: "Canone rinnovo server e dominio 2026 - barberia95.it",
          quantity: new Decimal(1),
          unitPrice: new Decimal(140),
          taxRateId: TAX_IVA_21,
        },
      ],
    },
    {
      number: "FTT-2026-007",
      clientId: crurated.id,
      date: new Date("2026-02-25"),
      dueDate: new Date("2026-03-27"),
      status: InvoiceStatus.emessa, // NON PAGATA
      disclaimer: "Operacion no sujeta a IVA - Art. 69.Uno.1 Ley 37/1992",
      notes: "Consultancy February 2026. Non ancora pagata.",
      lines: [
        {
          description: "Consultancy February 2026 - Digital consulting services",
          quantity: new Decimal(1),
          unitPrice: new Decimal(6666),
          taxRateId: TAX_EXPORT_EXEMPT,
        },
      ],
    },
  ];

  for (const inv of invoices) {
    // Check if already imported
    const existing = await prisma.invoice.findUnique({
      where: { userId_number: { userId: user.id, number: inv.number } },
    });
    if (existing) {
      console.log(`   -> ${inv.number} gia' presente, skip.`);
      continue;
    }

    await prisma.invoice.create({
      data: {
        userId: user.id,
        number: inv.number,
        clientId: inv.clientId,
        date: inv.date,
        dueDate: inv.dueDate,
        status: inv.status,
        currency: "EUR",
        exchangeRate: new Decimal(1),
        disclaimer: inv.disclaimer,
        notes: inv.notes,
        lines: {
          create: inv.lines,
        },
      },
    });
    console.log(`   -> ${inv.number} IMPORTATA`);
  }

  console.log("\n=== IMPORT COMPLETATO ===");

  // Summary
  const totalInvoices = await prisma.invoice.count({
    where: { number: { startsWith: "FTT-2026-" } },
  });
  console.log(`\nTotale fatture FTT-2026 nel sistema: ${totalInvoices}`);
}

main()
  .catch((e) => {
    console.error("ERRORE:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
