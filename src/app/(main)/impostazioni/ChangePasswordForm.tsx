"use client";

import { useState } from "react";
import {
  changePassword,
  type ChangePasswordFormData,
  type ChangePasswordResult,
} from "./actions";

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
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {result.message}
        </div>
      )}
      {result && !result.success && result.message && !result.errors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {result.message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password attuale *
        </label>
        <input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fieldError("currentPassword") && (
          <p className="text-red-600 text-sm mt-1">
            {fieldError("currentPassword")}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nuova password *
        </label>
        <input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fieldError("newPassword") && (
          <p className="text-red-600 text-sm mt-1">
            {fieldError("newPassword")}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Conferma nuova password *
        </label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fieldError("confirmPassword") && (
          <p className="text-red-600 text-sm mt-1">
            {fieldError("confirmPassword")}
          </p>
        )}
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? "Aggiornamento..." : "Cambia Password"}
        </button>
      </div>
    </form>
  );
}
