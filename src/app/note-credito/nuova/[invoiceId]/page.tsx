import { getInvoiceForCreditNote } from "../../actions";
import { notFound } from "next/navigation";
import CreditNoteForm from "./CreditNoteForm";

export const dynamic = "force-dynamic";

export default async function NewCreditNotePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const invoice = await getInvoiceForCreditNote(invoiceId);

  if (!invoice) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Nuova Nota di Credito
      </h1>
      <CreditNoteForm invoice={invoice} />
    </div>
  );
}
