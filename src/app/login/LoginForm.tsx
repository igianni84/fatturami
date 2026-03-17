"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, sendMagicLink } from "./actions";
import { OAuthButtons } from "@/components/OAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authError ? "Errore di autenticazione. Riprova." : "");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "magic-link") {
        const result = await sendMagicLink({ email });
        if (result.success) {
          setMagicLinkSent(true);
        } else {
          setError(result.error || "Errore nell'invio del magic link");
        }
      } else {
        const result = await login({ email, password });
        if (result.success) {
          router.push("/");
          router.refresh();
        } else {
          setError(result.error || "Errore durante il login");
        }
      }
    } catch {
      setError("Errore di connessione");
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
            Accedi al tuo account
          </p>
        </div>

        <Card>
          <CardHeader className="sr-only">
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <OAuthButtons />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  oppure
                </span>
              </div>
            </div>

            {magicLinkSent ? (
              <Alert>
                <AlertDescription>
                  Controlla la tua email! Ti abbiamo inviato un link per accedere.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
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
                </div>

                {mode === "password" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? mode === "magic-link"
                      ? "Invio in corso..."
                      : "Accesso in corso..."
                    : mode === "magic-link"
                      ? "Invia magic link"
                      : "Accedi"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setMode(mode === "password" ? "magic-link" : "password");
                      setError("");
                    }}
                  >
                    {mode === "password"
                      ? "Accedi con magic link"
                      : "Accedi con password"}
                  </button>
                </p>

                <p className="text-center text-sm text-muted-foreground">
                  Non hai un account?{" "}
                  <Link href="/registrati" className="text-primary hover:underline">
                    Registrati
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
