import { Suspense } from "react";
import { getDashboardData } from "./actions";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

const VALID_PERIODS = ["month", "quarter", "year"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = VALID_PERIODS.includes(params.period || "")
    ? params.period!
    : "month";

  const data = await getDashboardData(period);
  return (
    <Suspense>
      <Dashboard data={data} period={period} />
    </Suspense>
  );
}
