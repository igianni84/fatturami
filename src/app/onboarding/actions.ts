"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { getFieldErrors } from "@/lib/utils";

const baseSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  city: z.string().min(1, "La città è obbligatoria"),
  postalCode: z.string().min(1, "Il CAP è obbligatorio"),
  email: z.string().email("Email non valida").or(z.literal("")),
  phone: z.string(),
  iban: z.string(),
});

// NIF: 8 digits + letter (DNI) or letter + 7 digits + letter (NIE/CIF)
const nifRegex = /^(\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])$/i;
// Partita IVA: IT + 11 digits
const partitaIvaRegex = /^(IT)?\d{11}$/i;

const esSchema = baseSchema.extend({
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

const itSchema = baseSchema.extend({
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

const onboardingSchema = z.discriminatedUnion("country", [esSchema, itSchema]);

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

export type OnboardingResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function completeOnboarding(
  data: OnboardingFormData
): Promise<OnboardingResult> {
  const result = onboardingSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: getFieldErrors(result.error),
    };
  }

  const { userId } = await requireUser();

  // Prevent duplicate onboarding
  const existing = await prisma.company.findUnique({ where: { userId } });
  if (existing) {
    return { success: false, message: "Azienda già configurata" };
  }

  await prisma.company.create({
    data: {
      userId,
      name: result.data.name,
      nif: result.data.nif,
      address: result.data.address,
      city: result.data.city,
      postalCode: result.data.postalCode,
      country: result.data.country,
      email: result.data.email || "",
      phone: result.data.phone || "",
      iban: result.data.iban || "",
      taxRegime: result.data.taxRegime,
      fiscalCode: result.data.fiscalCode || "",
      sdiCode: result.data.sdiCode || "",
      pec: result.data.pec || "",
    },
  });

  return { success: true };
}
