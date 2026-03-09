import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { detectVatRegime, normalizeCountryCode } from "../src/lib/vat-regime";

const prisma = new PrismaClient();

// Country name to ISO code mapping
const COUNTRY_MAP: Record<string, string> = {
  italia: "IT",
  italy: "IT",
  malta: "MT",
  francia: "FR",
  france: "FR",
  germania: "DE",
  germany: "DE",
  spagna: "ES",
  spain: "ES",
};

function mapCountry(paese: string): string {
  if (!paese) return "IT";
  const lower = paese.toLowerCase().trim();
  return COUNTRY_MAP[lower] || paese.toUpperCase().substring(0, 2);
}

function cleanPostalCode(cap: string): string {
  if (!cap) return "";
  // Remove trailing ".0" from numbers like "84098.0"
  return cap.replace(/\.0$/, "").padStart(5, "0");
}

function cleanPhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/\.0$/, "").trim();
}

async function main() {
  // Read company country from settings
  const company = await prisma.company.findFirst({ select: { country: true } });
  const companyCountry = company?.country || "ES";
  console.log(`Company country: ${companyCountry}\n`);

  const csvPath = path.resolve(
    "/Users/igianni84/Library/CloudStorage/GoogleDrive-giovanni@crurated.com/My Drive/Lista_clienti_aggiornata.csv"
  );

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  // Header line
  const headers = lines[0].split(";");
  console.log("Headers:", headers);
  console.log(`Found ${lines.length - 1} client rows\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");

    const name = cols[0]?.trim();
    if (!name) {
      skipped++;
      continue;
    }

    const address = cols[1]?.trim() || "";
    const city = cols[2]?.trim() || "";
    const postalCode = cleanPostalCode(cols[3]?.trim() || "");
    const provincia = cols[4]?.trim() || "";
    const country = mapCountry(cols[5]?.trim() || "Italia");
    const email = cols[6]?.trim() || "";
    const referente = cols[7]?.trim() || "";
    const telefono = cleanPhone(cols[8]?.trim() || "");
    const vatNumber = cols[9]?.trim() || "";
    const fiscalCode = cols[10]?.trim() || "";
    const pec = cols[11]?.trim() || "";
    const sdi = cols[12]?.trim() || "";
    const viesStr = cols[13]?.trim() || "";

    // Build notes from extra fields
    const notesParts: string[] = [];
    if (provincia) notesParts.push(`Provincia: ${provincia}`);
    if (referente) notesParts.push(`Referente: ${referente}`);
    if (telefono) notesParts.push(`Telefono: ${telefono}`);
    if (pec) notesParts.push(`PEC: ${pec}`);
    if (sdi) notesParts.push(`Codice SDI: ${sdi}`);
    const notes = notesParts.join("\n");

    const vatRegime = detectVatRegime(country, companyCountry);
    const viesValid = viesStr.toUpperCase() === "SI" ? true : viesStr.toUpperCase() === "NO" ? false : null;

    // Check if client already exists (by name)
    const existing = await prisma.client.findFirst({
      where: {
        name: { equals: name },
        deletedAt: null,
      },
    });

    if (existing) {
      console.log(`  SKIP (exists): ${name}`);
      skipped++;
      continue;
    }

    try {
      await prisma.client.create({
        data: {
          name,
          vatNumber,
          fiscalCode,
          address,
          city,
          postalCode,
          country,
          email,
          currency: "EUR",
          vatRegime,
          notes,
          viesValid,
          viesValidatedAt: viesValid !== null ? new Date() : null,
        },
      });
      console.log(`  OK: ${name}`);
      created++;
    } catch (err: any) {
      console.error(`  ERROR: ${name} - ${err.message}`);
      errors++;
    }
  }

  console.log(`\n--- Import Summary ---`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
