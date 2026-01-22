export const dynamic = "force-dynamic";

import Link from "next/link";

export default function PreventiviPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Preventivi</h1>
        <Link
          href="/preventivi/nuovo"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Nuovo Preventivo
        </Link>
      </div>
      <p className="text-gray-500">Nessun preventivo presente.</p>
    </div>
  );
}
