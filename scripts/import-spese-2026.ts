import {
  PrismaClient,
  ExpenseCategory,
  PurchaseInvoiceStatus,
  TaxRateType,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { copyFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const prisma = new PrismaClient();

const SPESE_DIR = join(process.cwd(), "SPESE");
const UPLOADS_DIR = join(process.cwd(), "uploads", "acquisti");

// --- Helper: copy PDF to uploads ---
async function copyPdfToUploads(
  filename: string
): Promise<string | null> {
  const src = join(SPESE_DIR, filename);
  if (!existsSync(src)) {
    console.log(`      [WARN] PDF non trovato: ${filename}`);
    return null;
  }
  await mkdir(UPLOADS_DIR, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = join(UPLOADS_DIR, safeName);
  await copyFile(src, dest);
  return `uploads/acquisti/${safeName}`;
}

// --- Helper: find or create supplier ---
async function findOrCreateSupplier(
  userId: string,
  name: string,
  country: string,
  category: ExpenseCategory,
  vatNumber = "",
  extra: { address?: string; city?: string; email?: string } = {}
): Promise<string> {
  let supplier = await prisma.supplier.findFirst({
    where: { name: { equals: name }, deletedAt: null },
  });
  if (supplier) {
    console.log(`   -> ${name} gia' presente (id: ${supplier.id})`);
    return supplier.id;
  }
  supplier = await prisma.supplier.create({
    data: {
      userId,
      name,
      vatNumber,
      country,
      expenseCategory: category,
      address: extra.address || "",
      city: extra.city || "",
      email: extra.email || "",
    },
  });
  console.log(`   -> ${name} CREATO (id: ${supplier.id})`);
  return supplier.id;
}

// --- Types ---
interface InvoiceLine {
  description: string;
  amount: number;
  taxRateId: string;
  deductible: boolean;
}

interface ExpenseEntry {
  date: string; // YYYY-MM-DD
  supplierKey: string; // key into supplierIds map
  invoiceNumber: string;
  category: ExpenseCategory;
  notes: string;
  pdfFile: string | null; // filename in SPESE/ or null
  lines: InvoiceLine[];
}

async function main() {
  console.log("=== IMPORT SPESE 2026 ===\n");

  // Get the first user (single-tenant import script)
  const user = await prisma.user.findFirstOrThrow();
  console.log(`Using user: ${user.email} (${user.id})\n`);

  // =============================================
  // 1. CREATE/CHECK TAX RATES
  // =============================================
  console.log("1. Checking/creating tax rates...");

  // IVA 22% Italia (might already exist from incassi import)
  const TAX_IVA_22 = "seed-standard-IT-22";
  await prisma.taxRate.upsert({
    where: { id: TAX_IVA_22 },
    update: { name: "IVA 22% (Italia)", rate: 22, country: "IT", type: TaxRateType.standard },
    create: { id: TAX_IVA_22, name: "IVA 22% (Italia)", rate: 22, country: "IT", type: TaxRateType.standard },
  });
  console.log("   -> IVA 22% (Italia) OK");

  // Esente IVA 0% (for domestic exempt expenses: rent, social security, etc.)
  const TAX_ESENTE = "seed-esente-ES";
  await prisma.taxRate.upsert({
    where: { id: TAX_ESENTE },
    update: { name: "Esente IVA (0%)", rate: 0, country: "ES", type: TaxRateType.export_exempt },
    create: { id: TAX_ESENTE, name: "Esente IVA (0%)", rate: 0, country: "ES", type: TaxRateType.export_exempt },
  });
  console.log("   -> Esente IVA (0%) OK");

  // Standard IDs
  const TAX_IVA_21 = "seed-standard-ES"; // 21% standard
  const TAX_EXTRA_EU = "seed-export_exempt-EXTRA-EU"; // 0% extra-EU

  console.log("   -> Tax rates OK\n");

  // =============================================
  // 2. CREATE SUPPLIERS
  // =============================================
  console.log("2. Creating/checking suppliers...\n");

  const supplierIds: Record<string, string> = {};

  supplierIds["padrone"] = await findOrCreateSupplier(
    user.id, "Padrone di casa", "ES", ExpenseCategory.altro,
    "", { address: "CR Malilla 23 24", city: "Valencia" }
  );
  supplierIds["redi"] = await findOrCreateSupplier(
    user.id, "Redi", "ES", ExpenseCategory.telecomunicazioni
  );
  supplierIds["ploi"] = await findOrCreateSupplier(
    user.id, "Ploi", "NL", ExpenseCategory.software
  );
  supplierIds["contabo"] = await findOrCreateSupplier(
    user.id, "Contabo", "DE", ExpenseCategory.software
  );
  supplierIds["wizzair"] = await findOrCreateSupplier(
    user.id, "Wizzair", "HU", ExpenseCategory.viaggi
  );
  supplierIds["ia_spiegata"] = await findOrCreateSupplier(
    user.id, "IA Spiegata Semplice s.r.l.", "IT", ExpenseCategory.servizi_professionali,
    "08717290723", { address: "Claustro Santoro Tubito 15", city: "Altamura (BA)", email: "michele@iaspiegatasemplice.it" }
  );
  supplierIds["ryanair"] = await findOrCreateSupplier(
    user.id, "Ryanair", "IE", ExpenseCategory.viaggi
  );
  supplierIds["endesa"] = await findOrCreateSupplier(
    user.id, "Endesa Energia S.A.", "ES", ExpenseCategory.altro,
    "A81948077", { address: "C/Ribera del Loira 60", city: "Madrid" }
  );
  supplierIds["incogni"] = await findOrCreateSupplier(
    user.id, "Incogni Inc.", "US", ExpenseCategory.software
  );
  supplierIds["commercialista"] = await findOrCreateSupplier(
    user.id, "Commercialista", "ES", ExpenseCategory.servizi_professionali
  );
  supplierIds["the5ers"] = await findOrCreateSupplier(
    user.id, "The5ers", "IL", ExpenseCategory.software
  );
  supplierIds["fundingpips"] = await findOrCreateSupplier(
    user.id, "FundingPips", "AE", ExpenseCategory.software
  );
  supplierIds["amazon"] = await findOrCreateSupplier(
    user.id, "Amazon", "LU", ExpenseCategory.hardware
  );
  supplierIds["seguridad"] = await findOrCreateSupplier(
    user.id, "Seguridad Social", "ES", ExpenseCategory.altro
  );
  supplierIds["aruba"] = await findOrCreateSupplier(
    user.id, "Aruba", "IT", ExpenseCategory.software
  );
  supplierIds["hetzner"] = await findOrCreateSupplier(
    user.id, "Hetzner", "DE", ExpenseCategory.software
  );
  supplierIds["register"] = await findOrCreateSupplier(
    user.id, "Register", "IT", ExpenseCategory.software
  );
  supplierIds["fundednext"] = await findOrCreateSupplier(
    user.id, "FundedNext", "AE", ExpenseCategory.software
  );
  supplierIds["spem"] = await findOrCreateSupplier(
    user.id, "Spem Espanol Sin Atascos", "ES", ExpenseCategory.servizi_professionali
  );

  console.log("");

  // =============================================
  // 3. DEFINE ALL 2026 EXPENSES
  // =============================================
  // Deductibility rules:
  //   100% -> 1 line, deductible=true
  //   30%  -> 2 lines: 30% deductible + 70% non-deductible
  //   50%  -> 2 lines: 50% deductible + 50% non-deductible
  //
  // For Endesa: amount base is 104.97 (base + imp. electricidad) at 21%
  //   because IVA 21% is applied on 104.97 in the actual bill.
  //   Total: 104.97 + 22.04 = 127.01

  const round2 = (n: number) => Math.round(n * 100) / 100;

  function splitDeductible(
    desc: string,
    amount: number,
    taxRateId: string,
    pct: number
  ): InvoiceLine[] {
    if (pct === 100) {
      return [{ description: desc, amount: round2(amount), taxRateId, deductible: true }];
    }
    const dedAmount = round2(amount * pct / 100);
    const nonDedAmount = round2(amount - dedAmount);
    return [
      { description: `${desc} (deducibile ${pct}%)`, amount: dedAmount, taxRateId, deductible: true },
      { description: `${desc} (non deducibile ${100 - pct}%)`, amount: nonDedAmount, taxRateId, deductible: false },
    ];
  }

  const expenses: ExpenseEntry[] = [
    // --- GENNAIO 2026 ---
    {
      date: "2026-01-02",
      supplierKey: "padrone",
      invoiceNumber: "AFFITTO-2026-01",
      category: ExpenseCategory.altro,
      notes: "Affitto casa - ufficio in casa. Deducibile 30%.",
      pdfFile: null, // Affitto_Febbraio.pdf mancante
      lines: splitDeductible("Affitto casa gennaio 2026", 1250.00, TAX_ESENTE, 30),
    },
    {
      date: "2026-01-09",
      supplierKey: "redi",
      invoiceNumber: "REDI-9686",
      category: ExpenseCategory.telecomunicazioni,
      notes: "Internet casa gennaio. Deducibile 50%.",
      pdfFile: "REDI_factura_9686.pdf",
      lines: splitDeductible("Internet casa gennaio 2026", 16.45, TAX_IVA_21, 50),
    },
    {
      date: "2026-01-14",
      supplierKey: "ploi",
      invoiceNumber: "P2026-0001467",
      category: ExpenseCategory.software,
      notes: "Server management Ploi.",
      pdfFile: "ploi-invoice-2026-01-14-P2026-0001467.pdf",
      lines: [{ description: "Server management", amount: 13.00, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-01-15",
      supplierKey: "contabo",
      invoiceNumber: "CONTABO-2026-01",
      category: ExpenseCategory.software,
      notes: "Server hosting Contabo.",
      pdfFile: "proforma_invoice.pdf",
      lines: [{ description: "Server hosting", amount: 23.95, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-01-19",
      supplierKey: "wizzair",
      invoiceNumber: "DWAM-43347947",
      category: ExpenseCategory.viaggi,
      notes: "Volo per AI Week Milano.",
      pdfFile: "DWAM-43347947.pdf",
      lines: [{ description: "Volo AI Week Milano", amount: 42.28, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-01-18",
      supplierKey: "ia_spiegata",
      invoiceNumber: "125/2026/02",
      category: ExpenseCategory.servizi_professionali,
      notes: "Ticket AI WEEK 2026 - VIP, Fiera Milano Rho 19-20 Maggio 2026.",
      pdfFile: "Fattura_125_2026_02.pdf",
      lines: [{ description: "Ticket AI WEEK 2026 - VIP", amount: 259.02, taxRateId: TAX_IVA_22, deductible: true }],
    },
    {
      date: "2026-01-19",
      supplierKey: "ryanair",
      invoiceNumber: "3921726-108001-2026",
      category: ExpenseCategory.viaggi,
      notes: "Volo per AI Week Milano.",
      pdfFile: "3921726_RYANAIR_108001-2026_IE.pdf",
      lines: [{ description: "Volo AI Week Milano", amount: 19.99, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-01-24",
      supplierKey: "endesa",
      invoiceNumber: "P26CON003141949",
      category: ExpenseCategory.altro,
      notes: "Bolletta elettrica gen 2026 (periodo 16/12/2025-19/01/2026). Base 99.91 + Imp. electricidad 5.06 = 104.97 IVA base. Deducibile 30%.",
      pdfFile: "endesa_gennaio.pdf",
      // Endesa: IVA base = 104.97 (base 99.91 + imp. electricidad 5.06), IVA 21% = 22.04, total 127.01
      lines: splitDeductible("Bolletta elettrica gennaio 2026", 104.97, TAX_IVA_21, 30),
    },
    {
      date: "2026-01-24",
      supplierKey: "incogni",
      invoiceNumber: "INCOGNI-2026-01",
      category: ExpenseCategory.software,
      notes: "Software sicurezza Incogni.",
      pdfFile: "incogni.pdf",
      lines: [{ description: "Software sicurezza Incogni", amount: 67.37, taxRateId: TAX_IVA_21, deductible: true }],
    },
    {
      date: "2026-01-24",
      supplierKey: "commercialista",
      invoiceNumber: "COMM-2026-01",
      category: ExpenseCategory.servizi_professionali,
      notes: "Tariffa mensile commercialista gennaio 2026.",
      pdfFile: null,
      lines: [{ description: "Tariffa mensile commercialista gen 2026", amount: 60.00, taxRateId: TAX_IVA_21, deductible: true }],
    },
    {
      date: "2026-01-29",
      supplierKey: "the5ers",
      invoiceNumber: "THE5ERS-2026-01",
      category: ExpenseCategory.software,
      notes: "Licenza Challenge prop trading.",
      pdfFile: "the5ers_1.pdf",
      lines: [{ description: "Licenza Challenge The5ers", amount: 457.29, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-01-29",
      supplierKey: "fundingpips",
      invoiceNumber: "FPIPS-2026-01",
      category: ExpenseCategory.software,
      notes: "Licenza Challenge prop trading.",
      pdfFile: "funding_pips1.pdf",
      lines: [{ description: "Licenza Challenge FundingPips", amount: 369.27, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-01-29",
      supplierKey: "amazon",
      invoiceNumber: "AMZN-MONITOR-2026",
      category: ExpenseCategory.hardware,
      notes: "Monitor PC.",
      pdfFile: "monitor_amazon.pdf",
      lines: [{ description: "Monitor PC", amount: 618.99, taxRateId: TAX_IVA_21, deductible: true }],
    },
    {
      date: "2026-01-30",
      supplierKey: "seguridad",
      invoiceNumber: "SS-2026-01",
      category: ExpenseCategory.altro,
      notes: "Contributi Seguridad Social gennaio 2026.",
      pdfFile: null,
      lines: [{ description: "Contributi Seguridad Social gen 2026", amount: 87.61, taxRateId: TAX_ESENTE, deductible: true }],
    },
    {
      date: "2026-01-31",
      supplierKey: "aruba",
      invoiceNumber: "1000261200000629",
      category: ExpenseCategory.software,
      notes: "Rinnovo domini per conto clienti.",
      pdfFile: "1000261200000629.pdf",
      lines: [{ description: "Rinnovo server e domini", amount: 58.94, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-01-31",
      supplierKey: "register",
      invoiceNumber: "6226072653",
      category: ExpenseCategory.software,
      notes: "Rinnovo domini per conto clienti.",
      pdfFile: "6226072653.pdf",
      lines: [{ description: "Rinnovo domini", amount: 45.40, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },

    // --- FEBBRAIO 2026 ---
    {
      date: "2026-02-01",
      supplierKey: "padrone",
      invoiceNumber: "AFFITTO-2026-02",
      category: ExpenseCategory.altro,
      notes: "Affitto casa - ufficio in casa. Deducibile 30%.",
      pdfFile: null, // Affitto_Febbraio.pdf mancante
      lines: splitDeductible("Affitto casa febbraio 2026", 1250.00, TAX_ESENTE, 30),
    },
    {
      date: "2026-02-03",
      supplierKey: "hetzner",
      invoiceNumber: "084000668456",
      category: ExpenseCategory.software,
      notes: "Server Hetzner.",
      pdfFile: "Hetzner_2026-02-03_084000668456.pdf",
      lines: [{ description: "Server hosting Hetzner", amount: 19.41, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-02-05",
      supplierKey: "redi",
      invoiceNumber: "REDI-FEB-2026",
      category: ExpenseCategory.telecomunicazioni,
      notes: "Internet casa febbraio. Deducibile 50%.",
      pdfFile: "REDI_factura_febbraio.pdf",
      lines: splitDeductible("Internet casa febbraio 2026", 16.45, TAX_IVA_21, 50),
    },
    {
      date: "2026-02-18",
      supplierKey: "fundednext",
      invoiceNumber: "FNEXT-2026-02",
      category: ExpenseCategory.software,
      notes: "Licenza Challenge prop trading.",
      pdfFile: "fundednext.pdf",
      lines: [{ description: "Licenza Challenge FundedNext", amount: 465.94, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-02-18",
      supplierKey: "the5ers",
      invoiceNumber: "THE5ERS-2026-02",
      category: ExpenseCategory.software,
      notes: "Licenza Challenge prop trading.",
      pdfFile: "the5ers_2.pdf",
      lines: [{ description: "Licenza Challenge The5ers", amount: 427.82, taxRateId: TAX_EXTRA_EU, deductible: true }],
    },
    {
      date: "2026-02-22",
      supplierKey: "spem",
      invoiceNumber: "SPEM-2026-02",
      category: ExpenseCategory.servizi_professionali,
      notes: "Corso spagnolo febbraio 2026.",
      pdfFile: "corso-spagnolo-febbraio.pdf",
      lines: [{ description: "Corso spagnolo febbraio 2026", amount: 400.00, taxRateId: TAX_ESENTE, deductible: true }],
    },
    {
      date: "2026-02-24",
      supplierKey: "commercialista",
      invoiceNumber: "COMM-2026-02",
      category: ExpenseCategory.servizi_professionali,
      notes: "Tariffa mensile commercialista febbraio 2026.",
      pdfFile: null,
      lines: [{ description: "Tariffa mensile commercialista feb 2026", amount: 60.00, taxRateId: TAX_IVA_21, deductible: true }],
    },
    {
      date: "2026-02-28",
      supplierKey: "seguridad",
      invoiceNumber: "SS-2026-02",
      category: ExpenseCategory.altro,
      notes: "Contributi Seguridad Social febbraio 2026.",
      pdfFile: null,
      lines: [{ description: "Contributi Seguridad Social feb 2026", amount: 87.61, taxRateId: TAX_ESENTE, deductible: true }],
    },

    // --- MARZO 2026 ---
    {
      date: "2026-03-01",
      supplierKey: "padrone",
      invoiceNumber: "AFFITTO-2026-03",
      category: ExpenseCategory.altro,
      notes: "Affitto casa - ufficio in casa. Deducibile 30%.",
      pdfFile: null, // Affitto_Marzo.pdf mancante
      lines: splitDeductible("Affitto casa marzo 2026", 1250.00, TAX_ESENTE, 30),
    },
  ];

  // =============================================
  // 4. IMPORT PURCHASE INVOICES
  // =============================================
  console.log("3. Importing purchase invoices...\n");

  let imported = 0;
  let skipped = 0;

  for (const exp of expenses) {
    const supplierId = supplierIds[exp.supplierKey];
    if (!supplierId) {
      console.log(`   [ERROR] Supplier key "${exp.supplierKey}" not found!`);
      continue;
    }

    // Check for duplicate
    const existing = await prisma.purchaseInvoice.findFirst({
      where: { supplierId, number: exp.invoiceNumber },
    });
    if (existing) {
      console.log(`   -> ${exp.invoiceNumber} (${exp.supplierKey}) gia' presente, skip.`);
      skipped++;
      continue;
    }

    // Copy PDF if available
    let filePath: string | null = null;
    if (exp.pdfFile) {
      filePath = await copyPdfToUploads(exp.pdfFile);
    }

    await prisma.purchaseInvoice.create({
      data: {
        userId: user.id,
        supplierId,
        number: exp.invoiceNumber,
        date: new Date(exp.date),
        category: exp.category,
        status: PurchaseInvoiceStatus.pagata,
        filePath,
        notes: exp.notes,
        lines: {
          create: exp.lines.map((l) => ({
            description: l.description,
            amount: new Decimal(l.amount),
            taxRateId: l.taxRateId,
            deductible: l.deductible,
          })),
        },
      },
    });
    imported++;
    const lineCount = exp.lines.length;
    console.log(`   -> ${exp.invoiceNumber} IMPORTATA (${lineCount} rig${lineCount > 1 ? "he" : "a"}${filePath ? ", PDF allegato" : ""})`);
  }

  // =============================================
  // 5. SUMMARY
  // =============================================
  console.log("\n=== RIEPILOGO ===");
  console.log(`Fatture importate: ${imported}`);
  console.log(`Fatture gia' presenti (skip): ${skipped}`);

  const totalPurchaseInvoices = await prisma.purchaseInvoice.count();
  const totalSuppliers = await prisma.supplier.count({ where: { deletedAt: null } });

  console.log(`\nTotale fatture acquisto nel sistema: ${totalPurchaseInvoices}`);
  console.log(`Totale fornitori nel sistema: ${totalSuppliers}`);

  // Compute totals for verification
  const allImported = await prisma.purchaseInvoice.findMany({
    where: { date: { gte: new Date("2026-01-01"), lt: new Date("2027-01-01") } },
    include: { lines: { include: { taxRate: true } }, supplier: true },
  });

  let totalImponibile = 0;
  let totalIVA = 0;
  for (const pi of allImported) {
    for (const line of pi.lines) {
      const amount = Number(line.amount);
      const rate = Number(line.taxRate.rate);
      totalImponibile += amount;
      totalIVA += amount * rate / 100;
    }
  }
  console.log(`\nTotale imponibile 2026: €${totalImponibile.toFixed(2)}`);
  console.log(`Totale IVA 2026: €${totalIVA.toFixed(2)}`);
  console.log(`Totale complessivo 2026: €${(totalImponibile + totalIVA).toFixed(2)}`);

  console.log("\n=== IMPORT COMPLETATO ===");
}

main()
  .catch((e) => {
    console.error("ERRORE:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
