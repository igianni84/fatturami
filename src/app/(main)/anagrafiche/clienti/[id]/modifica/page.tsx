import { notFound } from "next/navigation";
import { getClient } from "../../actions";
import ClientForm from "../../ClientForm";
import { getCompanyCountry } from "@/app/(main)/impostazioni/actions";

export const dynamic = "force-dynamic";

export default async function ModificaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [clientData, companyCountry] = await Promise.all([
    getClient(id),
    getCompanyCountry(),
  ]);

  if (!clientData) {
    notFound();
  }

  return <ClientForm initialData={clientData} clientId={id} companyCountry={companyCountry} />;
}
