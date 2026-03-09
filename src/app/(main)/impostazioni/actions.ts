"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

// NIF validation: 8 digits + letter (DNI) or letter + 7 digits + letter (NIE/CIF)
const nifRegex = /^(\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])$/i;

const companySchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  nif: z
    .string()
    .min(1, "Il NIF/CIF è obbligatorio")
    .regex(nifRegex, "Formato NIF non valido (es: 12345678A o B1234567A)"),
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  city: z.string().min(1, "La città è obbligatoria"),
  postalCode: z.string().min(1, "Il CAP è obbligatorio"),
  country: z.string().min(1, "Il paese è obbligatorio"),
  email: z.string().email("Email non valida").or(z.literal("")),
  phone: z.string(),
  iban: z.string(),
  taxRegime: z.string(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

export type CompanyActionResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getCompany(): Promise<CompanyFormData | null> {
  const company = await prisma.company.findFirst();
  if (!company) return null;
  return {
    name: company.name,
    nif: company.nif,
    address: company.address,
    city: company.city,
    postalCode: company.postalCode,
    country: company.country,
    email: company.email,
    phone: company.phone,
    iban: company.iban,
    taxRegime: company.taxRegime,
  };
}

export async function saveCompany(
  data: CompanyFormData
): Promise<CompanyActionResult> {
  const result = companySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await prisma.company.findFirst();

  if (existing) {
    await prisma.company.update({
      where: { id: existing.id },
      data: result.data,
    });
  } else {
    await prisma.company.create({
      data: result.data,
    });
  }

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
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: "Utente non autenticato" };
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.userId },
  });

  if (!user) {
    return { success: false, message: "Utente non trovato" };
  }

  const isValid = await verifyPassword(parsed.data.currentPassword, user.password);
  if (!isValid) {
    return {
      success: false,
      errors: { currentPassword: ["La password attuale non è corretta"] },
    };
  }

  const hashedPassword = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  await logAuditEvent({
    userId: user.id,
    action: "PASSWORD_CHANGE",
    details: { email: user.email },
  });

  return { success: true, message: "Password aggiornata con successo" };
}
