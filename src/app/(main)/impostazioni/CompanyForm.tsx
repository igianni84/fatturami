"use client";

import { useState } from "react";
import {
  saveCompany,
  type CompanyFormData,
  type CompanyActionResult,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
        <Alert>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="name">Nome / Ragione Sociale *</Label>
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
        <Label htmlFor="nif">NIF/CIF *</Label>
        <Input
          id="nif"
          type="text"
          name="nif"
          value={formData.nif}
          onChange={handleChange}
          placeholder="Es: 12345678A o B1234567A"
          className="mt-1"
        />
        {fieldError("nif") && (
          <p className="text-sm text-destructive mt-1">{fieldError("nif")}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address">Indirizzo *</Label>
        <Input
          id="address"
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="mt-1"
        />
        {fieldError("address") && (
          <p className="text-sm text-destructive mt-1">{fieldError("address")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">Città *</Label>
          <Input
            id="city"
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="mt-1"
          />
          {fieldError("city") && (
            <p className="text-sm text-destructive mt-1">{fieldError("city")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="postalCode">CAP *</Label>
          <Input
            id="postalCode"
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            className="mt-1"
          />
          {fieldError("postalCode") && (
            <p className="text-sm text-destructive mt-1">
              {fieldError("postalCode")}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="country">Paese *</Label>
        <Input
          id="country"
          type="text"
          name="country"
          value={formData.country}
          onChange={handleChange}
          className="mt-1"
        />
        {fieldError("country") && (
          <p className="text-sm text-destructive mt-1">{fieldError("country")}</p>
        )}
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
        <Label htmlFor="phone">Telefono</Label>
        <Input
          id="phone"
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="iban">IBAN</Label>
        <Input
          id="iban"
          type="text"
          name="iban"
          value={formData.iban}
          onChange={handleChange}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Regime Fiscale</Label>
        <Select
          value={formData.taxRegime || undefined}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, taxRegime: value }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Seleziona..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="autonomo">Autónomo</SelectItem>
            <SelectItem value="sociedad">Sociedad</SelectItem>
            <SelectItem value="cooperativa">Cooperativa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvataggio..." : "Salva Impostazioni"}
        </Button>
      </div>
    </form>
  );
}
