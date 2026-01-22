import ExpenseForm from "./ExpenseForm";

export const dynamic = "force-dynamic";

export default function NuovaSpesaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuova Spesa</h1>
      <ExpenseForm />
    </div>
  );
}
