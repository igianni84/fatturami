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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectVatRegime,
  EU_COUNTRIES,
  EU_COUNTRY_CODES,
  EXTRA_EU_COUNTRIES,
} from "@/lib/vat-regime";
import { toast } from "sonner";

const VAT_REGIME_LABELS: Record<string, string> = {
  nazionale: "Nazionale",
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
  companyCountry: string;
}

export default function ClientForm({ initialData, clientId, companyCountry }: ClientFormProps) {
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
    ? detectVatRegime(formData.country, companyCountry)
    : null;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
      toast.success("Cliente salvato");
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
          <Alert variant="destructive">
            <AlertDescription>
              {result.message || "Errore durante il salvataggio"}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="name">Ragione Sociale *</Label>
          <Input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1"
          />
          {fieldError("name") && (
            <p className="text-sm text-destructive mt-1">{fieldError("name")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="country">Paese *</Label>
          <Select
            value={formData.country || undefined}
            onValueChange={(value) => setFormData({ ...formData, country: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleziona paese..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Paesi UE</SelectLabel>
                {EU_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Extra-UE</SelectLabel>
                {EXTRA_EU_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldError("country") && (
            <p className="text-sm text-destructive mt-1">{fieldError("country")}</p>
          )}
          {detectedRegime && (
            <p className="text-sm text-gray-500 mt-1">
              Regime IVA: <span className="font-medium">{VAT_REGIME_LABELS[detectedRegime]}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vatNumber">Partita IVA / VAT Number</Label>
            <Input
              id="vatNumber"
              type="text"
              name="vatNumber"
              value={formData.vatNumber}
              onChange={handleChange}
              placeholder="Es: IT12345678901"
              className="mt-1"
            />
            {fieldError("vatNumber") && (
              <p className="text-sm text-destructive mt-1">{fieldError("vatNumber")}</p>
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
            <Label htmlFor="fiscalCode">Codice Fiscale</Label>
            <Input
              id="fiscalCode"
              type="text"
              name="fiscalCode"
              value={formData.fiscalCode}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Indirizzo</Label>
          <Input
            id="address"
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">Città</Label>
            <Input
              id="city"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="postalCode">CAP</Label>
            <Input
              id="postalCode"
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1"
          />
          {fieldError("email") && (
            <p className="text-sm text-destructive mt-1">{fieldError("email")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency">Valuta Preferita *</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleziona valuta..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - Sterlina britannica</SelectItem>
              <SelectItem value="USD">USD - Dollaro americano</SelectItem>
              <SelectItem value="CHF">CHF - Franco svizzero</SelectItem>
            </SelectContent>
          </Select>
          {fieldError("currency") && (
            <p className="text-sm text-destructive mt-1">{fieldError("currency")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="notes">Note</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="mt-1"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvataggio..." : "Salva Cliente"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/anagrafiche/clienti")}
          >
            Annulla
          </Button>
        </div>
      </form>
    </div>
  );
}
