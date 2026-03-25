export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getQuotes } from "./actions";
import QuoteList from "./QuoteList";

export default async function PreventiviPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  const { quotes, totalCount } = await getQuotes({ page, pageSize: 10 });

  return (
    <Suspense>
      <QuoteList
        quotes={quotes}
        totalCount={totalCount}
        page={page}
      />
    </Suspense>
  );
}
