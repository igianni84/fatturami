"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { VatRegime } from "@prisma/client";

// --- List ---

export interface ClientListItem {
  id: string;
  name: string;
  vatNumber: string;
  country: string;
  email: string;
}

export interface ClientListResult {
  clients: ClientListItem[];
  totalCount: number;
}

export async function getClients(
  search: string = "",
  page: number = 1,
  pageSize: number = 10
): Promise<ClientListResult> {
  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { vatNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [clients, totalCount] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        vatNumber: true,
        country: true,
        email: true,
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return { clients, totalCount };
}

// --- EU country codes ---

const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

// --- VAT regime auto-detection ---

function detectVatRegime(country: string): VatRegime {
  const code = country.toUpperCase().trim();
  if (code === "ES") return VatRegime.nazionale;
  if (EU_COUNTRIES.includes(code)) return VatRegime.intraUE;
  return VatRegime.extraUE;
}

// --- VAT number validation by country prefix ---

const VAT_PATTERNS: Record<string, RegExp> = {
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/i,
  IT: /^\d{11}$/,
  FR: /^[A-Z0-9]{2}\d{9}$/i,
  DE: /^\d{9}$/,
  PT: /^\d{9}$/,
  GB: /^\d{9}(\d{3})?$/,
  AT: /^U\d{8}$/i,
  BE: /^0\d{9}$/,
  NL: /^\d{9}B\d{2}$/i,
};

function validateVatNumber(vatNumber: string, country: string): boolean {
  if (!vatNumber) return true; // optional field
  const pattern = VAT_PATTERNS[country.toUpperCase()];
  if (!pattern) return true; // no pattern for unknown countries, allow any
  return pattern.test(vatNumber);
}

// --- Zod schema ---

const clientSchema = z.object({
  name: z.string().min(1, "La ragione sociale è obbligatoria"),
  vatNumber: z.string(),
  fiscalCode: z.string(),
  address: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string().min(1, "Il paese è obbligatorio"),
  email: z.string().email("Email non valida").or(z.literal("")),
  currency: z.string().min(1, "La valuta è obbligatoria"),
  notes: z.string(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

export type ClientActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// --- Get single client ---

export async function getClient(id: string): Promise<ClientFormData | null> {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || client.deletedAt) return null;
  return {
    name: client.name,
    vatNumber: client.vatNumber,
    fiscalCode: client.fiscalCode,
    address: client.address,
    city: client.city,
    postalCode: client.postalCode,
    country: client.country,
    email: client.email,
    currency: client.currency,
    notes: client.notes,
  };
}

// --- Create client ---

export async function createClient(
  data: ClientFormData
): Promise<ClientActionResult> {
  const result = clientSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { country, vatNumber } = result.data;

  if (vatNumber && !validateVatNumber(vatNumber, country)) {
    return {
      success: false,
      errors: { vatNumber: ["Formato partita IVA non valido per il paese selezionato"] },
    };
  }

  const vatRegime = detectVatRegime(country);

  await prisma.client.create({
    data: {
      ...result.data,
      vatRegime,
    },
  });

  return { success: true, message: "Cliente creato con successo" };
}

// --- Update client ---

export async function updateClient(
  id: string,
  data: ClientFormData
): Promise<ClientActionResult> {
  const result = clientSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { country, vatNumber } = result.data;

  if (vatNumber && !validateVatNumber(vatNumber, country)) {
    return {
      success: false,
      errors: { vatNumber: ["Formato partita IVA non valido per il paese selezionato"] },
    };
  }

  const vatRegime = detectVatRegime(country);

  await prisma.client.update({
    where: { id },
    data: {
      ...result.data,
      vatRegime,
    },
  });

  return { success: true, message: "Cliente aggiornato con successo" };
}
