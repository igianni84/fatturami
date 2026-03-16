import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Auto-provision: ensure a Prisma User record exists for this Supabase user
  const dbUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    update: { email: user.email! },
    create: {
      supabaseId: user.id,
      email: user.email!,
    },
    select: { id: true, email: true },
  });

  return { userId: dbUser.id, email: dbUser.email };
}
