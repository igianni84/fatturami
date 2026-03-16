import ExpenseForm from "./ExpenseForm";

export const dynamic = "force-dynamic";

export default function NuovaSpesaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Nuova Spesa</h1>
      <ExpenseForm />
    </div>
  );
}
