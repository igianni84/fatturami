"use client";

import { useState } from "react";
import {
  saveCompany,
  type CompanyFormData,
  type CompanyActionResult,
} from "./actions";

// Loose form state — discriminated union is enforced server-side by Zod
type FormState = {
  name: string;
  nif: string;
  address: string;
  city: string;
  postalCode: string;
  country: "ES" | "IT";
  email: string;
  phone: string;
  iban: string;
  taxRegime: string;
  fiscalCode: string;
  sdiCode: string;
  pec: string;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function CompanyForm({
  initialData,
}: {
  initialData: CompanyFormData | null;
}) {
  const [formData, setFormData] = useState<FormState>(
    initialData ?? {
      name: "",
      nif: "",
      address: "",
      city: "",
      postalCode: "",
      country: "ES",
      email: "",
      phone: "",
      iban: "",
      taxRegime: "autonomo",
      fiscalCode: "",
      sdiCode: "",
      pec: "",
    }
  );
  const [result, setResult] = useState<CompanyActionResult | null>(null);
  const [saving, setSaving] = useState(false);

  const country = formData.country;
  const isIT = country === "IT";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    const res = await saveCompany(formData as CompanyFormData);
    if (res.success) {
      toast.success("Impostazioni salvate");
    }
    setResult(res);
    setSaving(false);
  }

  function fieldError(field: string): string | undefined {
    return result?.errors?.[field]?.[0];
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result?.success && (
        <Alert>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
      {result?.message && !result.success && (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Country badge (read-only after onboarding) */}
      <div>
        <Label>Paese</Label>
        <div className="mt-1">
          <Badge variant="secondary" className="text-sm">
            {isIT ? "Italia" : "España"} ({country})
          </Badge>
        </div>
      </div>

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
        <Label htmlFor="nif">{isIT ? "Partita IVA *" : "NIF/CIF *"}</Label>
        <Input
          id="nif"
          type="text"
          name="nif"
          value={formData.nif}
          onChange={handleChange}
          placeholder={isIT ? "Es: IT12345678901" : "Es: 12345678A o B1234567A"}
          className="mt-1"
        />
        {fieldError("nif") && (
          <p className="text-sm text-destructive mt-1">{fieldError("nif")}</p>
        )}
      </div>

      {isIT && (
        <>
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
            {fieldError("fiscalCode") && (
              <p className="text-sm text-destructive mt-1">{fieldError("fiscalCode")}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sdiCode">Codice SDI</Label>
              <Input
                id="sdiCode"
                type="text"
                name="sdiCode"
                value={formData.sdiCode}
                onChange={handleChange}
                placeholder="0000000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pec">PEC</Label>
              <Input
                id="pec"
                type="text"
                name="pec"
                value={formData.pec}
                onChange={handleChange}
                placeholder="azienda@pec.it"
                className="mt-1"
              />
              {fieldError("pec") && (
                <p className="text-sm text-destructive mt-1">{fieldError("pec")}</p>
              )}
            </div>
          </div>
        </>
      )}

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
            {isIT ? (
              <>
                <SelectItem value="forfettario">Regime Forfettario</SelectItem>
                <SelectItem value="ordinario">Regime Ordinario</SelectItem>
                <SelectItem value="semplificato">Regime Semplificato</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="autonomo">Autónomo</SelectItem>
                <SelectItem value="sociedad">Sociedad</SelectItem>
                <SelectItem value="cooperativa">Cooperativa</SelectItem>
              </>
            )}
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
