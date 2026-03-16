"use client";

import { useState } from "react";
import Link from "next/link";
import { register } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegistrationForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [result, setResult] = useState<{
    success?: boolean;
    errors?: Record<string, string[]>;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  function fieldError(field: string) {
    return result?.errors?.[field]?.[0];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const res = await register({ email, password, confirmPassword });
      setResult(res);
    } catch {
      setResult({ message: "Errore di connessione" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold">
            Sistema di Fatturazione
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Crea il tuo account
          </p>
        </div>

        <Card>
          <CardHeader className="sr-only">
            <CardTitle>Registrazione</CardTitle>
          </CardHeader>
          <CardContent>
            {result?.success ? (
              <Alert>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {result?.message && (
                  <Alert variant="destructive">
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@esempio.com"
                  />
                  {fieldError("email") && (
                    <p className="text-sm text-destructive">
                      {fieldError("email")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 12 caratteri"
                  />
                  {fieldError("password") && (
                    <p className="text-sm text-destructive">
                      {fieldError("password")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Conferma Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la password"
                  />
                  {fieldError("confirmPassword") && (
                    <p className="text-sm text-destructive">
                      {fieldError("confirmPassword")}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrazione in corso..." : "Registrati"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Hai già un account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Accedi
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
