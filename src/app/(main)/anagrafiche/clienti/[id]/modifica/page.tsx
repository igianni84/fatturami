import { notFound } from "next/navigation";
import { getClient } from "../../actions";
import ClientForm from "../../ClientForm";

export const dynamic = "force-dynamic";

export default async function ModificaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientData = await getClient(id);

  if (!clientData) {
    notFound();
  }

  return <ClientForm initialData={clientData} clientId={id} />;
}
