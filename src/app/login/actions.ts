"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
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

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Always call verifyPassword to prevent timing-based user enumeration
  const isValid = await verifyPassword(
    password,
    user?.password || "$2a$12$invalidhashplaceholdervalue.placeholder"
  );

  if (!user || !isValid) {
    await logAuditEvent({
      action: "LOGIN_FAILURE",
      details: { email: parsed.data.email },
    });
    return { success: false, error: "Email o password non corretta" };
  }

  const token = await createToken(user.id, user.email);
  await setAuthCookie(token);

  await logAuditEvent({
    userId: user.id,
    action: "LOGIN_SUCCESS",
    details: { email: parsed.data.email },
  });

  return { success: true };
}
