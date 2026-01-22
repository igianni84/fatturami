"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createClient,
  updateClient,
  type ClientFormData,
  type ClientActionResult,
  type ClientData,
  type ViesStatus,
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

const EU_COUNTRY_CODES = EU_COUNTRIES.map((c) => c.code);

function detectVatRegime(country: string): string {
  const code = country.toUpperCase().trim();
  if (code === "ES") return "nazionale";
  if (EU_COUNTRY_CODES.includes(code)) return "intraUE";
  return "extraUE";
}

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

const ALL_COUNTRIES = [...EU_COUNTRIES, ...EXTRA_EU_COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name)
);

const VAT_REGIME_LABELS: Record<string, string> = {
  nazionale: "Nazionale (ES)",
  intraUE: "Intra-UE",
  extraUE: "Extra-UE",
};

const emptyForm: ClientFormData = {
  name: "",
  vatNumber: "",
  fiscalCode: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  email: "",
  currency: "EUR",
  notes: "",
};

interface ClientFormProps {
  initialData?: ClientData | null;
  clientId?: string;
}

export default function ClientForm({ initialData, clientId }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!clientId;
  const [formData, setFormData] = useState<ClientFormData>(
    initialData ?? emptyForm
  );
  const [result, setResult] = useState<ClientActionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [viesStatus, setViesStatus] = useState<ViesStatus | null>(
    initialData
      ? { valid: initialData.viesValid, validatedAt: initialData.viesValidatedAt }
      : null
  );

  const detectedRegime = formData.country
    ? detectVatRegime(formData.country)
    : null;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    const res = isEdit
      ? await updateClient(clientId!, formData)
      : await createClient(formData);

    if (res.success) {
      if (res.viesStatus) {
        setViesStatus(res.viesStatus);
      }
      router.push("/anagrafiche/clienti");
    } else {
      setResult(res);
      setSaving(false);
    }
  }

  function fieldError(field: keyof ClientFormData): string | undefined {
    return result?.errors?.[field]?.[0];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? "Modifica Cliente" : "Nuovo Cliente"}
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
          {detectedRegime && (
            <p className="text-sm text-gray-500 mt-1">
              Regime IVA: <span className="font-medium">{VAT_REGIME_LABELS[detectedRegime]}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            {viesStatus && formData.vatNumber && EU_COUNTRY_CODES.includes(formData.country.toUpperCase()) && (
              <div className="mt-1">
                {viesStatus.valid === true && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    VIES: Valida
                    {viesStatus.validatedAt && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({new Date(viesStatus.validatedAt).toLocaleDateString("it-IT")})
                      </span>
                    )}
                  </p>
                )}
                {viesStatus.valid === false && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    VIES: Non valida
                    {viesStatus.validatedAt && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({new Date(viesStatus.validatedAt).toLocaleDateString("it-IT")})
                      </span>
                    )}
                  </p>
                )}
                {viesStatus.valid === null && viesStatus.message && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                    {viesStatus.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Codice Fiscale
            </label>
            <input
              type="text"
              name="fiscalCode"
              value={formData.fiscalCode}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            Valuta Preferita *
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - Sterlina britannica</option>
            <option value="USD">USD - Dollaro americano</option>
            <option value="CHF">CHF - Franco svizzero</option>
          </select>
          {fieldError("currency") && (
            <p className="text-red-600 text-sm mt-1">{fieldError("currency")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : isEdit ? "Aggiorna" : "Crea Cliente"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/anagrafiche/clienti")}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
