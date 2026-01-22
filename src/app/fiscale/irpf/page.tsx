export const dynamic = "force-dynamic";

import { getIRPFReport } from "./actions";
import IRPFReport from "./IRPFReport";

export default async function IRPFPage() {
  const year = new Date().getFullYear();
  const data = await getIRPFReport(year);

  return <IRPFReport initialData={data} initialYear={year} />;
}
