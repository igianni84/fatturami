"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { VatRegime } from "@prisma/client";
import { validateVatVies, isViesEligible } from "@/lib/vies";

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
            { name: { contains: search } },
            { vatNumber: { contains: search } },
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

export type ViesStatus = {
  valid: boolean | null;
  validatedAt: string | null;
  message?: string;
};

export type ClientActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  viesStatus?: ViesStatus;
};

// --- Get single client ---

export interface ClientData extends ClientFormData {
  viesValid: boolean | null;
  viesValidatedAt: string | null;
}

export async function getClient(id: string): Promise<ClientData | null> {
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
    viesValid: client.viesValid,
    viesValidatedAt: client.viesValidatedAt?.toISOString() ?? null,
  };
}

// --- Create client ---

export async function createClient(
  data: ClientFormData
): Promise<ClientActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

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

  // VIES validation for EU clients with VAT number
  let viesValid: boolean | null = null;
  let viesValidatedAt: Date | null = null;
  let viesMessage: string | undefined;

  if (vatNumber && isViesEligible(country)) {
    const viesResult = await validateVatVies(vatNumber, country);
    if (viesResult.valid !== null) {
      viesValid = viesResult.valid;
      viesValidatedAt = new Date();
    } else {
      // Service unavailable - allow saving with warning
      viesMessage = viesResult.error;
    }
  }

  await prisma.client.create({
    data: {
      ...result.data,
      vatRegime,
      viesValid,
      viesValidatedAt,
    },
  });

  const viesStatus: ViesStatus = {
    valid: viesValid,
    validatedAt: viesValidatedAt?.toISOString() ?? null,
    message: viesMessage,
  };

  return {
    success: true,
    message: viesValid === false
      ? "Cliente creato. Attenzione: partita IVA non valida secondo VIES."
      : viesMessage
        ? `Cliente creato. Avviso: ${viesMessage}`
        : "Cliente creato con successo",
    viesStatus,
  };
}

// --- Delete client (soft delete) ---

export async function deleteClient(id: string): Promise<ClientActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { success: true, message: "Cliente eliminato con successo" };
}

// --- Update client ---

export async function updateClient(
  id: string,
  data: ClientFormData
): Promise<ClientActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Non autenticato" };
  }

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

  // VIES validation for EU clients with VAT number
  let viesValid: boolean | null = null;
  let viesValidatedAt: Date | null = null;
  let viesMessage: string | undefined;

  if (vatNumber && isViesEligible(country)) {
    const viesResult = await validateVatVies(vatNumber, country);
    if (viesResult.valid !== null) {
      viesValid = viesResult.valid;
      viesValidatedAt = new Date();
    } else {
      // Service unavailable - keep existing validation, but warn
      const existing = await prisma.client.findUnique({
        where: { id },
        select: { viesValid: true, viesValidatedAt: true },
      });
      viesValid = existing?.viesValid ?? null;
      viesValidatedAt = existing?.viesValidatedAt ?? null;
      viesMessage = viesResult.error;
    }
  }

  await prisma.client.update({
    where: { id },
    data: {
      ...result.data,
      vatRegime,
      viesValid,
      viesValidatedAt,
    },
  });

  const viesStatus: ViesStatus = {
    valid: viesValid,
    validatedAt: viesValidatedAt?.toISOString() ?? null,
    message: viesMessage,
  };

  return {
    success: true,
    message: viesValid === false
      ? "Cliente aggiornato. Attenzione: partita IVA non valida secondo VIES."
      : viesMessage
        ? `Cliente aggiornato. Avviso: ${viesMessage}`
        : "Cliente aggiornato con successo",
    viesStatus,
  };
}
