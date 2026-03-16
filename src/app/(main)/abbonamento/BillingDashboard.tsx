"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type BillingInfo } from "@/lib/billing";
import { createCheckoutSession, createPortalSession } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  free: "Free",
  active: "Pro",
  past_due: "Pro (pagamento in sospeso)",
  canceled: "Free (cancellato)",
};

const statusColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  past_due: "bg-yellow-100 text-yellow-800",
  canceled: "bg-red-100 text-red-800",
};

export default function BillingDashboard({ billing }: { billing: BillingInfo }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | null>(null);

  const isFree = billing.status === "free" || billing.status === "canceled";
  const isPro = billing.status === "active" || billing.status === "past_due";

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Abbonamento Pro attivato con successo!");
      router.replace("/abbonamento");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout annullato");
      router.replace("/abbonamento");
    }
  }, [searchParams, router]);

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    try {
      const result = await createCheckoutSession(plan);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.message || "Errore durante la creazione del checkout");
        setLoading(null);
      }
    } catch {
      toast.error("Errore durante la creazione del checkout");
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.message || "Errore durante l'apertura del portale");
        setLoading(null);
      }
    } catch {
      toast.error("Errore durante l'apertura del portale");
      setLoading(null);
    }
  };

  const progressPercent = billing.limit
    ? Math.min((billing.emittedCount / billing.limit) * 100, 100)
    : 0;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abbonamento</h1>
        <Badge className={statusColors[billing.status]}>
          {statusLabels[billing.status]}
        </Badge>
      </div>

      {billing.status === "past_due" && (
        <Alert className="mb-6 border-yellow-300 bg-yellow-50">
          <AlertTitle>Pagamento non riuscito</AlertTitle>
          <AlertDescription>
            Il tuo ultimo pagamento non è andato a buon fine. Stripe ritenterà automaticamente.
            Puoi aggiornare il metodo di pagamento dal portale.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fatture emesse</CardTitle>
          <CardDescription>
            {isPro
              ? `${billing.emittedCount} fatture emesse — nessun limite`
              : `${billing.emittedCount} di ${billing.limit} fatture nel piano gratuito`}
          </CardDescription>
        </CardHeader>
        {isFree && (
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  progressPercent >= 100 ? "bg-red-500" : progressPercent >= 80 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {!billing.canEmit && (
              <p className="text-sm text-red-600 mt-2">
                Hai raggiunto il limite. Passa a Pro per continuare ad emettere fatture.
              </p>
            )}
          </CardContent>
        )}
        {isPro && billing.currentPeriodEnd && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Prossimo rinnovo: {new Date(billing.currentPeriodEnd).toLocaleDateString("it-IT")}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Pricing cards or manage button */}
      {isFree ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Mensile</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-gray-900">€10</span>
                <span className="text-muted-foreground">/mese</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>Fatture illimitate</li>
                <li>Tutte le funzionalità</li>
                <li>Cancellazione in qualsiasi momento</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleCheckout("monthly")}
                disabled={loading !== null}
              >
                {loading === "monthly" ? "Caricamento..." : "Passa a Pro"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-green-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Annuale</CardTitle>
                <Badge className="bg-green-100 text-green-800">Risparmi €20</Badge>
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-gray-900">€100</span>
                <span className="text-muted-foreground">/anno</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>Fatture illimitate</li>
                <li>Tutte le funzionalità</li>
                <li>2 mesi gratis rispetto al mensile</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleCheckout("yearly")}
                disabled={loading !== null}
              >
                {loading === "yearly" ? "Caricamento..." : "Passa a Pro"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handlePortal}
              disabled={loading !== null}
              variant="outline"
            >
              {loading === "portal" ? "Caricamento..." : "Gestisci abbonamento"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Modifica il metodo di pagamento, cambia piano o cancella dal portale Stripe.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
