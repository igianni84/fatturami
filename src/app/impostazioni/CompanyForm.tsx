"use client";

import { useState } from "react";
import {
  saveCompany,
  type CompanyFormData,
  type CompanyActionResult,
} from "./actions";

const emptyForm: CompanyFormData = {
  name: "",
  nif: "",
  address: "",
  city: "",
  postalCode: "",
  country: "ES",
  email: "",
  phone: "",
  iban: "",
  taxRegime: "",
};

export default function CompanyForm({
  initialData,
}: {
  initialData: CompanyFormData | null;
}) {
  const [formData, setFormData] = useState<CompanyFormData>(
    initialData ?? emptyForm
  );
  const [result, setResult] = useState<CompanyActionResult | null>(null);
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
    const res = await saveCompany(formData);
    setResult(res);
    setSaving(false);
  }

  function fieldError(field: keyof CompanyFormData): string | undefined {
    return result?.errors?.[field]?.[0];
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {result.message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome / Ragione Sociale *
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
          NIF/CIF *
        </label>
        <input
          type="text"
          name="nif"
          value={formData.nif}
          onChange={handleChange}
          placeholder="Es: 12345678A o B1234567A"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fieldError("nif") && (
          <p className="text-red-600 text-sm mt-1">{fieldError("nif")}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Indirizzo *
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fieldError("address") && (
          <p className="text-red-600 text-sm mt-1">{fieldError("address")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Città *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldError("city") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("city")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CAP *
          </label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldError("postalCode") && (
            <p className="text-red-600 text-sm mt-1">
              {fieldError("postalCode")}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paese *
        </label>
        <input
          type="text"
          name="country"
          value={formData.country}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fieldError("country") && (
          <p className="text-red-600 text-sm mt-1">{fieldError("country")}</p>
        )}
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
          Telefono
        </label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          IBAN
        </label>
        <input
          type="text"
          name="iban"
          value={formData.iban}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Regime Fiscale
        </label>
        <select
          name="taxRegime"
          value={formData.taxRegime}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleziona...</option>
          <option value="autonomo">Autónomo</option>
          <option value="sociedad">Sociedad</option>
          <option value="cooperativa">Cooperativa</option>
        </select>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? "Salvataggio..." : "Salva"}
        </button>
      </div>
    </form>
  );
}
