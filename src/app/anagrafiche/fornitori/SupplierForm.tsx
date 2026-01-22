"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSupplier,
  updateSupplier,
  type SupplierFormData,
  type SupplierActionResult,
} from "./actions";

const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgio" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croazia" },
  { code: "CY", name: "Cipro" },
  { code: "CZ", name: "Repubblica Ceca" },
  { code: "DK", name: "Danimarca" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finlandia" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Germania" },
  { code: "GR", name: "Grecia" },
  { code: "HU", name: "Ungheria" },
  { code: "IE", name: "Irlanda" },
  { code: "IT", name: "Italia" },
  { code: "LV", name: "Lettonia" },
  { code: "LT", name: "Lituania" },
  { code: "LU", name: "Lussemburgo" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Paesi Bassi" },
  { code: "PL", name: "Polonia" },
  { code: "PT", name: "Portogallo" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovacchia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spagna" },
  { code: "SE", name: "Svezia" },
];

const EXTRA_EU_COUNTRIES = [
  { code: "GB", name: "Regno Unito" },
  { code: "US", name: "Stati Uniti" },
  { code: "CH", name: "Svizzera" },
  { code: "NO", name: "Norvegia" },
  { code: "JP", name: "Giappone" },
  { code: "CN", name: "Cina" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "BR", name: "Brasile" },
  { code: "MX", name: "Messico" },
];

const EXPENSE_CATEGORIES = [
  { value: "servizi_professionali", label: "Servizi professionali" },
  { value: "software", label: "Software" },
  { value: "hardware", label: "Hardware" },
  { value: "viaggi", label: "Viaggi" },
  { value: "telecomunicazioni", label: "Telecomunicazioni" },
  { value: "altro", label: "Altro" },
];

const emptyForm: SupplierFormData = {
  name: "",
  vatNumber: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  email: "",
  expenseCategory: "altro",
};

interface SupplierFormProps {
  initialData?: SupplierFormData | null;
  supplierId?: string;
}

export default function SupplierForm({ initialData, supplierId }: SupplierFormProps) {
  const router = useRouter();
  const isEdit = !!supplierId;
  const [formData, setFormData] = useState<SupplierFormData>(
    initialData ?? emptyForm
  );
  const [result, setResult] = useState<SupplierActionResult | null>(null);
  const [saving, setSaving] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    const res = isEdit
      ? await updateSupplier(supplierId!, formData)
      : await createSupplier(formData);

    if (res.success) {
      router.push("/anagrafiche/fornitori");
    } else {
      setResult(res);
      setSaving(false);
    }
  }

  function fieldError(field: keyof SupplierFormData): string | undefined {
    return result?.errors?.[field]?.[0];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? "Modifica Fornitore" : "Nuovo Fornitore"}
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {result?.success === false && !result.errors && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {result.message || "Errore durante il salvataggio"}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ragione Sociale *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldError("name") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("name")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partita IVA / VAT Number
          </label>
          <input
            type="text"
            name="vatNumber"
            value={formData.vatNumber}
            onChange={handleChange}
            placeholder="Es: IT12345678901"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldError("vatNumber") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("vatNumber")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paese *
          </label>
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona paese...</option>
            <optgroup label="UE">
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </optgroup>
            <optgroup label="Extra-UE">
              {EXTRA_EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </optgroup>
          </select>
          {fieldError("country") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("country")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Indirizzo
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Città
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CAP
            </label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldError("email") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("email")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria Spesa *
          </label>
          <select
            name="expenseCategory"
            value={formData.expenseCategory}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {fieldError("expenseCategory") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("expenseCategory")}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : isEdit ? "Aggiorna" : "Crea Fornitore"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/anagrafiche/fornitori")}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
