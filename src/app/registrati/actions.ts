"use server";

import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { loginRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { getFieldErrors } from "@/lib/utils";

const registrationSchema = z
  .object({
    email: z.string().email("Email non valida"),
    password: z
      .string()
      .min(12, "La password deve avere almeno 12 caratteri")
      .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
      .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola")
      .regex(/[0-9]/, "La password deve contenere almeno un numero")
      .regex(
        /[^A-Za-z0-9]/,
        "La password deve contenere almeno un carattere speciale"
      ),
    confirmPassword: z.string().min(1, "La conferma password è obbligatoria"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export type RegistrationFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegistrationResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function register(
  data: RegistrationFormData
): Promise<RegistrationResult> {
  const parsed = registrationSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      errors: getFieldErrors(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  // Rate limiting: reuse login limiter (5 attempts per 15 minutes per email)
  const rateCheck = loginRateLimiter.check(email.toLowerCase());
  if (!rateCheck.allowed) {
    await logAuditEvent({
      action: "REGISTRATION_RATE_LIMITED",
      details: { email, retryAfterMs: rateCheck.retryAfterMs },
    });
    const retryMinutes = Math.ceil(rateCheck.retryAfterMs / 60_000);
    return {
      success: false,
      message: `Troppi tentativi. Riprova tra ${retryMinutes} minut${retryMinutes === 1 ? "o" : "i"}.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    await logAuditEvent({
      action: "REGISTRATION_FAILURE",
      details: { email, error: error.message },
    });
    return {
      success: false,
      message: "Errore durante la registrazione. Riprova più tardi.",
    };
  }

  await logAuditEvent({
    action: "REGISTRATION_SUCCESS",
    details: { email },
  });

  return {
    success: true,
    message:
      "Registrazione completata! Controlla la tua email per confermare l'account.",
  };
}
