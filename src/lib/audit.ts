import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGIN_RATE_LIMITED"
  | "PASSWORD_CHANGE"
  | "AUTH_FAILURE"
  | "REGISTRATION_SUCCESS"
  | "REGISTRATION_FAILURE"
  | "REGISTRATION_RATE_LIMITED"
  | "MAGIC_LINK_SENT"
  | "MAGIC_LINK_FAILURE"
  | "MAGIC_LINK_RATE_LIMITED";

export async function logAuditEvent(params: {
  userId?: string;
  action: AuditAction;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        details: params.details ?? undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Audit logging must never break the primary flow
    console.error("Failed to write audit log:", error);
  }
}
