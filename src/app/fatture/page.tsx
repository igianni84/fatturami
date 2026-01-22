export const dynamic = "force-dynamic";

import Link from "next/link";

export default async function FatturePage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fatture</h1>
        <Link
          href="/fatture/nuova"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Nuova Fattura
        </Link>
      </div>
      <p className="text-gray-500">Nessuna fattura presente.</p>
    </div>
  );
}
