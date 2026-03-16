import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import AppShell from "./AppShell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await requireUser();

  const company = await prisma.company.findUnique({
    where: { userId },
    select: { country: true },
  });

  if (!company) {
    redirect("/onboarding");
  }

  return <AppShell companyCountry={company.country}>{children}</AppShell>;
}
