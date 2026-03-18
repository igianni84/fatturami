import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import OnboardingWizard from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = await requireUser();

  const company = await prisma.company.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (company) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
