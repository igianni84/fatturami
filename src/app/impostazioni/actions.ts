"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
