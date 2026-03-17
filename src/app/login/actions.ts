"use server";

import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { loginRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

export async function login(
  formData: { email: string; password: string }
): Promise<{ success: boolean; error?: string }> {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Credenziali non valide" };
  }

  const { email, password } = parsed.data;

  // Rate limiting: 5 attempts per 15 minutes per email
  const rateCheck = loginRateLimiter.check(email.toLowerCase());
  if (!rateCheck.allowed) {
    await logAuditEvent({
      action: "LOGIN_RATE_LIMITED",
      details: { email, retryAfterMs: rateCheck.retryAfterMs },
    });
    const retryMinutes = Math.ceil(rateCheck.retryAfterMs / 60_000);
    return {
      success: false,
      error: `Troppi tentativi di accesso. Riprova tra ${retryMinutes} minut${retryMinutes === 1 ? "o" : "i"}.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await logAuditEvent({
      action: "LOGIN_FAILURE",
      details: { email },
    });
    return { success: false, error: "Email o password non corretta" };
  }

  await logAuditEvent({
    action: "LOGIN_SUCCESS",
    details: { email },
  });

  return { success: true };
}

const magicLinkSchema = z.object({
  email: z.string().email("Email non valida"),
});

export async function sendMagicLink(
  formData: { email: string }
): Promise<{ success: boolean; error?: string }> {
  const parsed = magicLinkSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Email non valida" };
  }

  const { email } = parsed.data;

  // Rate limiting: reuse login limiter
  const rateCheck = loginRateLimiter.check(email.toLowerCase());
  if (!rateCheck.allowed) {
    await logAuditEvent({
      action: "MAGIC_LINK_RATE_LIMITED",
      details: { email, retryAfterMs: rateCheck.retryAfterMs },
    });
    const retryMinutes = Math.ceil(rateCheck.retryAfterMs / 60_000);
    return {
      success: false,
      error: `Troppi tentativi. Riprova tra ${retryMinutes} minut${retryMinutes === 1 ? "o" : "i"}.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    await logAuditEvent({
      action: "MAGIC_LINK_FAILURE",
      details: { email, error: error.message },
    });
    return { success: false, error: "Errore nell'invio del magic link. Riprova." };
  }

  await logAuditEvent({
    action: "MAGIC_LINK_SENT",
    details: { email },
  });

  return { success: true };
}
