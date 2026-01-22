import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SpesePage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Spese</h1>
        <Link
          href="/spese/nuova"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Nuova Spesa
        </Link>
      </div>
      <p className="text-gray-500">Nessuna spesa registrata.</p>
    </div>
  );
}
