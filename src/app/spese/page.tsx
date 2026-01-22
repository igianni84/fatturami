import { getExpenses } from "./actions";
import ExpenseList from "./ExpenseList";

export const dynamic = "force-dynamic";

export default async function SpesePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const category = params.category || "tutte";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";
  const deductible = params.deductible || "tutti";

  const { expenses, totalCount, totalAmount } = await getExpenses({
    page,
    pageSize: 10,
    category: category !== "tutte" ? category : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    deductible: deductible !== "tutti" ? deductible : undefined,
  });

  return (
    <ExpenseList
      expenses={expenses}
      totalCount={totalCount}
      totalAmount={totalAmount}
      page={page}
      currentCategory={category}
      currentDateFrom={dateFrom}
      currentDateTo={dateTo}
      currentDeductible={deductible}
    />
  );
}
