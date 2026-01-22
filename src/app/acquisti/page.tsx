import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AcquistiPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fatture di acquisto</h1>
        <Link
          href="/acquisti/nuovo"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Nuova fattura acquisto
        </Link>
      </div>
      <p className="text-gray-500">Nessuna fattura di acquisto registrata.</p>
    </div>
  );
}
