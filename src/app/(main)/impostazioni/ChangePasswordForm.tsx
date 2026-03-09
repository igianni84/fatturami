"use client";

import { useState } from "react";
import {
  changePassword,
  type ChangePasswordFormData,
  type ChangePasswordResult,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const emptyForm: ChangePasswordFormData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordForm() {
  const [formData, setFormData] = useState<ChangePasswordFormData>(emptyForm);
  const [result, setResult] = useState<ChangePasswordResult | null>(null);
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    const res = await changePassword(formData);
    setResult(res);
    setSaving(false);
    if (res.success) {
      setFormData(emptyForm);
    }
  }

  function fieldError(field: keyof ChangePasswordFormData): string | undefined {
    return result?.errors?.[field]?.[0];
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result?.success && (
        <Alert>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
      {result && !result.success && result.message && !result.errors && (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="currentPassword">Password attuale *</Label>
        <Input
          id="currentPassword"
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          className="mt-1"
        />
        {fieldError("currentPassword") && (
          <p className="text-sm text-destructive mt-1">
            {fieldError("currentPassword")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="newPassword">Nuova password *</Label>
        <Input
          id="newPassword"
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          className="mt-1"
        />
        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
          <li>Almeno 12 caratteri</li>
          <li>Almeno una lettera maiuscola</li>
          <li>Almeno una lettera minuscola</li>
          <li>Almeno un numero</li>
          <li>Almeno un carattere speciale</li>
        </ul>
        {fieldError("newPassword") && (
          <p className="text-sm text-destructive mt-1">
            {fieldError("newPassword")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword">Conferma nuova password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="mt-1"
        />
        {fieldError("confirmPassword") && (
          <p className="text-sm text-destructive mt-1">
            {fieldError("confirmPassword")}
          </p>
        )}
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvataggio..." : "Cambia Password"}
        </Button>
      </div>
    </form>
  );
}
