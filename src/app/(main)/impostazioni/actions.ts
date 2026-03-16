"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { getFieldErrors } from "@/lib/utils";

// NIF validation: 8 digits + letter (DNI) or letter + 7 digits + letter (NIE/CIF)
const nifRegex = /^(\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])$/i;
// Partita IVA: IT + 11 digits
const partitaIvaRegex = /^(IT)?\d{11}$/i;

const baseCompanySchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  city: z.string().min(1, "La città è obbligatoria"),
  postalCode: z.string().min(1, "Il CAP è obbligatorio"),
  email: z.string().email("Email non valida").or(z.literal("")),
  phone: z.string(),
  iban: z.string(),
});

const esCompanySchema = baseCompanySchema.extend({
  country: z.literal("ES"),
  nif: z
    .string()
    .min(1, "Il NIF/CIF è obbligatorio")
    .regex(nifRegex, "Formato NIF non valido (es: 12345678A o B1234567A)"),
  taxRegime: z.enum(["autonomo", "sociedad", "cooperativa"], {
    message: "Il regime fiscale è obbligatorio",
  }),
  fiscalCode: z.string().optional().default(""),
  sdiCode: z.string().optional().default(""),
  pec: z.string().optional().default(""),
});

const itCompanySchema = baseCompanySchema.extend({
  country: z.literal("IT"),
  nif: z
    .string()
    .min(1, "La Partita IVA è obbligatoria")
    .regex(partitaIvaRegex, "Formato Partita IVA non valido (es: IT12345678901)"),
  taxRegime: z.enum(["forfettario", "ordinario", "semplificato"], {
    message: "Il regime fiscale è obbligatorio",
  }),
  fiscalCode: z.string().optional().default(""),
  sdiCode: z.string().optional().default(""),
  pec: z.string().email("Formato PEC non valido").or(z.literal("")).optional().default(""),
});

const companySchema = z.discriminatedUnion("country", [esCompanySchema, itCompanySchema]);

export type CompanyFormData = z.infer<typeof companySchema>;

export type CompanyActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getCompanyCountry(): Promise<string> {
  const { userId } = await requireUser();
  const company = await prisma.company.findUnique({
    where: { userId },
    select: { country: true },
  });
  return company?.country || "ES";
}

export async function getCompany(): Promise<CompanyFormData | null> {
  const { userId } = await requireUser();
  const company = await prisma.company.findUnique({ where: { userId } });
  if (!company) return null;

  const base = {
    name: company.name,
    nif: company.nif,
    address: company.address,
    city: company.city,
    postalCode: company.postalCode,
    email: company.email,
    phone: company.phone,
    iban: company.iban,
    fiscalCode: company.fiscalCode,
    sdiCode: company.sdiCode,
    pec: company.pec,
  };

  if (company.country === "IT") {
    return {
      ...base,
      country: "IT" as const,
      taxRegime: company.taxRegime as "forfettario" | "ordinario" | "semplificato",
    };
  }
  return {
    ...base,
    country: "ES" as const,
    taxRegime: company.taxRegime as "autonomo" | "sociedad" | "cooperativa",
  };
}

export async function saveCompany(
  data: CompanyFormData
): Promise<CompanyActionResult> {
  const currentUser = await requireUser();

  // Enforce: country cannot change after onboarding
  const existing = await prisma.company.findUnique({
    where: { userId: currentUser.userId },
    select: { country: true },
  });
  if (existing && existing.country !== data.country) {
    return {
      success: false,
      message: "Il paese non può essere modificato dopo la configurazione iniziale",
    };
  }

  const result = companySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: getFieldErrors(result.error),
    };
  }

  await prisma.company.upsert({
    where: { userId: currentUser.userId },
    update: {
      name: result.data.name,
      nif: result.data.nif,
      address: result.data.address,
      city: result.data.city,
      postalCode: result.data.postalCode,
      email: result.data.email || "",
      phone: result.data.phone || "",
      iban: result.data.iban || "",
      taxRegime: result.data.taxRegime,
      fiscalCode: result.data.fiscalCode || "",
      sdiCode: result.data.sdiCode || "",
      pec: result.data.pec || "",
      // country NOT updated — immutable after onboarding
    },
    create: {
      userId: currentUser.userId,
      ...result.data,
      email: result.data.email || "",
      phone: result.data.phone || "",
      iban: result.data.iban || "",
      fiscalCode: result.data.fiscalCode || "",
      sdiCode: result.data.sdiCode || "",
      pec: result.data.pec || "",
    },
  });

  return { success: true, message: "Dati aziendali salvati con successo" };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La password attuale è obbligatoria"),
    newPassword: z
      .string()
      .min(12, "La password deve avere almeno 12 caratteri")
      .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
      .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola")
      .regex(/[0-9]/, "La password deve contenere almeno un numero")
      .regex(/[^A-Za-z0-9]/, "La password deve contenere almeno un carattere speciale"),
    confirmPassword: z.string().min(1, "La conferma password è obbligatoria"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function changePassword(
  data: ChangePasswordFormData
): Promise<ChangePasswordResult> {
  const parsed = changePasswordSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      errors: getFieldErrors(parsed.error),
    };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: "Utente non autenticato" };
  }

  const supabase = await createClient();

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password: parsed.data.currentPassword,
  });

  if (signInError) {
    return {
      success: false,
      errors: { currentPassword: ["La password attuale non è corretta"] },
    };
  }

  // Update password via Supabase
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return { success: false, message: "Errore nell'aggiornamento della password" };
  }

  await logAuditEvent({
    userId: currentUser.userId,
    action: "PASSWORD_CHANGE",
    details: { email: currentUser.email },
  });

  return { success: true, message: "Password aggiornata con successo" };
}
