"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSupplier,
  updateSupplier,
  type SupplierFormData,
  type SupplierActionResult,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      toast.success("Fornitore salvato");
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
        </div>

        <div>
          <Label>Paese *</Label>
          <Select
            value={formData.country || undefined}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Seleziona paese..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>UE</SelectLabel>
                {EU_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
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
          <Label>Categoria Spesa *</Label>
          <Select
            value={formData.expenseCategory || undefined}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, expenseCategory: value }))}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("expenseCategory") && (
            <p className="text-sm text-destructive mt-1">{fieldError("expenseCategory")}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvataggio..." : "Salva Fornitore"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/anagrafiche/fornitori")}
          >
            Annulla
          </Button>
        </div>
      </form>
    </div>
  );
}
