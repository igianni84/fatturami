import { getCreditNotes } from "./actions";
import CreditNoteList from "./CreditNoteList";

export const dynamic = "force-dynamic";

export default async function CreditNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const { items, totalCount } = await getCreditNotes({ page, pageSize: 10 });

  return (
    <CreditNoteList
      creditNotes={items}
      totalCount={totalCount}
      page={page}
    />
  );
}
