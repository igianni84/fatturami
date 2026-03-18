"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding, type OnboardingFormData, type OnboardingResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Country = "ES" | "IT";

const STEPS = ["Paese", "Dati aziendali", "Regime fiscale"] as const;

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nif: "",
    address: "",
    city: "",
    postalCode: "",
    email: "",
    phone: "",
    iban: "",
    taxRegime: "",
    fiscalCode: "",
    sdiCode: "",
    pec: "",
  });
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function fieldError(field: string): string | undefined {
    return result?.errors?.[field]?.[0];
  }

  async function handleSubmit() {
    if (!country) return;
    setSaving(true);
    setResult(null);

    const res = await completeOnboarding({
      ...formData,
      country,
      taxRegime: formData.taxRegime,
    } as OnboardingFormData);
    if (res.success) {
      router.push("/dashboard");
    } else {
      setResult(res);
      // If field errors exist, navigate to the relevant step
      if (res.errors) {
        const companyFields = ["name", "nif", "address", "city", "postalCode", "email", "phone", "iban", "fiscalCode", "sdiCode", "pec"];
        const regimeFields = ["taxRegime"];
        if (regimeFields.some((f) => res.errors?.[f])) {
          setStep(2);
        } else if (companyFields.some((f) => res.errors?.[f])) {
          setStep(1);
        }
      }
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {result?.message && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Step 0: Country selection */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">In quale paese operi?</h2>
          <p className="text-sm text-muted-foreground text-center">
            Questo determina le aliquote IVA, i campi fiscali e i report disponibili.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                country === "IT" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => setCountry("IT")}
            >
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-4xl mb-2">🇮🇹</span>
                <span className="font-semibold">Italia</span>
                <span className="text-xs text-muted-foreground mt-1">Partita IVA, IRPEF</span>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                country === "ES" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => setCountry("ES")}
            >
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-4xl mb-2">🇪🇸</span>
                <span className="font-semibold">España</span>
                <span className="text-xs text-muted-foreground mt-1">NIF/CIF, IRPF</span>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(1)} disabled={!country}>
              Continua
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Company details */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Dati aziendali</h2>

          <div>
            <Label htmlFor="name">Nome / Ragione Sociale *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1" />
            {fieldError("name") && <p className="text-sm text-destructive mt-1">{fieldError("name")}</p>}
          </div>

          <div>
            <Label htmlFor="nif">{country === "IT" ? "Partita IVA *" : "NIF/CIF *"}</Label>
            <Input
              id="nif"
              name="nif"
              value={formData.nif}
              onChange={handleChange}
              placeholder={country === "IT" ? "Es: IT12345678901" : "Es: 12345678A o B1234567A"}
              className="mt-1"
            />
            {fieldError("nif") && <p className="text-sm text-destructive mt-1">{fieldError("nif")}</p>}
          </div>

          {country === "IT" && (
            <>
              <div>
                <Label htmlFor="fiscalCode">Codice Fiscale</Label>
                <Input id="fiscalCode" name="fiscalCode" value={formData.fiscalCode} onChange={handleChange} className="mt-1" />
                {fieldError("fiscalCode") && <p className="text-sm text-destructive mt-1">{fieldError("fiscalCode")}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sdiCode">Codice SDI</Label>
                  <Input id="sdiCode" name="sdiCode" value={formData.sdiCode} onChange={handleChange} placeholder="0000000" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="pec">PEC</Label>
                  <Input id="pec" name="pec" value={formData.pec} onChange={handleChange} placeholder="azienda@pec.it" className="mt-1" />
                  {fieldError("pec") && <p className="text-sm text-destructive mt-1">{fieldError("pec")}</p>}
                </div>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="address">Indirizzo *</Label>
            <Input id="address" name="address" value={formData.address} onChange={handleChange} className="mt-1" />
            {fieldError("address") && <p className="text-sm text-destructive mt-1">{fieldError("address")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Città *</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleChange} className="mt-1" />
              {fieldError("city") && <p className="text-sm text-destructive mt-1">{fieldError("city")}</p>}
            </div>
            <div>
              <Label htmlFor="postalCode">CAP *</Label>
              <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} className="mt-1" />
              {fieldError("postalCode") && <p className="text-sm text-destructive mt-1">{fieldError("postalCode")}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="mt-1" />
            {fieldError("email") && <p className="text-sm text-destructive mt-1">{fieldError("email")}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" value={formData.iban} onChange={handleChange} className="mt-1" />
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(0)}>Indietro</Button>
            <Button onClick={() => { setResult(null); setStep(2); }}>Continua</Button>
          </div>
        </div>
      )}

      {/* Step 2: Tax regime */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Regime fiscale</h2>
          <p className="text-sm text-muted-foreground">
            Seleziona il regime fiscale applicabile alla tua attività.
          </p>

          <div>
            <Label>Regime Fiscale *</Label>
            <Select
              value={formData.taxRegime || undefined}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, taxRegime: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {country === "ES" ? (
                  <>
                    <SelectItem value="autonomo">Autónomo</SelectItem>
                    <SelectItem value="sociedad">Sociedad</SelectItem>
                    <SelectItem value="cooperativa">Cooperativa</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="forfettario">Regime Forfettario</SelectItem>
                    <SelectItem value="ordinario">Regime Ordinario</SelectItem>
                    <SelectItem value="semplificato">Regime Semplificato</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {fieldError("taxRegime") && <p className="text-sm text-destructive mt-1">{fieldError("taxRegime")}</p>}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.taxRegime}>
              {saving ? "Salvataggio..." : "Completa configurazione"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
