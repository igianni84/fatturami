export const dynamic = "force-dynamic";

import { getClients } from "./actions";
import ClientList from "./ClientList";

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function ClientiPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const { clients, totalCount } = await getClients(search, page, 10);

  return (
    <ClientList
      clients={clients}
      totalCount={totalCount}
      page={page}
      search={search}
    />
  );
}
