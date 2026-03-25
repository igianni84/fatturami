"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const sharedFeatures = [
  "Fatture, preventivi e note di credito",
  "Report IVA e IRPEF/IRPF automatici",
  "Import da PDF, CSV e XLS",
  "Dashboard con grafici interattivi",
  "Multi-valuta (EUR, USD, GBP)",
  "Anagrafica clienti e fornitori",
  "Validazione VIES partite IVA",
  "Generazione PDF multi-lingua",
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="prezzi" className="scroll-mt-16 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Prezzi semplici, senza sorprese
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Inizia gratis, passa a Pro quando il tuo business cresce.
          </p>

          <div className="mt-10 inline-flex items-center rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-all",
                !annual
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Mensile
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-all",
                annual
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Annuale
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                -17%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8">
            <h3 className="text-lg font-semibold text-slate-900">Free</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-slate-900">
                &euro;0
              </span>
              <span className="text-sm text-slate-500">/mese</span>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Perfetto per iniziare. Fino a 10 fatture emesse.
            </p>
            <Link
              href="/registrati"
              className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              Inizia gratis
            </Link>
            <ul className="mt-8 flex-1 space-y-3">
              {sharedFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-sm text-slate-600"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border-2 border-blue-600 bg-white p-8">
            <div className="absolute -top-3.5 left-8">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                Consigliato
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Pro</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-slate-900">
                {annual ? "€100" : "€10"}
              </span>
              <span className="text-sm text-slate-500">
                {annual ? "/anno" : "/mese"}
              </span>
            </div>
            {annual && (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                &euro;8,33/mese
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Risparmi &euro;20
                </span>
              </p>
            )}
            <p className="mt-4 text-sm text-slate-500">
              Fatture illimitate per professionisti che crescono.
            </p>
            <Link
              href="/registrati"
              className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Passa a Pro
            </Link>
            <ul className="mt-8 flex-1 space-y-3">
              <li className="flex items-start gap-3 text-sm font-medium text-slate-900">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                Fatture illimitate
              </li>
              {sharedFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-sm text-slate-600"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
