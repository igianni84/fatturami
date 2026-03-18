import Link from "next/link";
import {
  FileText,
  Calculator,
  Upload,
  Coins,
  BarChart3,
  Users,
  Check,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Fatturazione",
    description:
      "Fatture, preventivi e note di credito con numerazione automatica e PDF pronti all'invio.",
  },
  {
    icon: Calculator,
    title: "Report Fiscali",
    description:
      "IVA trimestrale, IRPEF e IRPF calcolati automaticamente. Sempre pronti per il commercialista.",
  },
  {
    icon: Upload,
    title: "Import Intelligente",
    description:
      "Importa da PDF con AI, CSV o XLS. Riconosce automaticamente i dati delle tue fatture.",
  },
  {
    icon: Coins,
    title: "Multi-valuta",
    description:
      "Fattura in EUR, USD, GBP e altre valute con conversione automatica nei report.",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    description:
      "Metriche e grafici interattivi per monitorare fatturato, incassi e spese in tempo reale.",
  },
  {
    icon: Users,
    title: "Clienti & Fornitori",
    description:
      "Anagrafica completa con validazione VIES per partite IVA intracomunitarie.",
  },
];

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

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-stone-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="font-display text-lg font-semibold tracking-tight text-stone-50">
            fatturami.cloud
          </span>
          <div className="flex items-center gap-6">
            <a
              href="#funzionalita"
              className="hidden text-sm text-stone-400 transition-colors hover:text-stone-50 sm:block"
            >
              Funzionalit&agrave;
            </a>
            <a
              href="#prezzi"
              className="hidden text-sm text-stone-400 transition-colors hover:text-stone-50 sm:block"
            >
              Prezzi
            </a>
            <Link
              href="/login"
              className="text-sm text-stone-400 transition-colors hover:text-stone-50"
            >
              Accedi
            </Link>
            <Link
              href="/registrati"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Inizia gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-950 px-6 py-24 md:py-32 lg:py-40">
        {/* Grain texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
          }}
        />
        <div className="relative mx-auto max-w-4xl">
          <h1 className="animate-fade-in-up font-display text-4xl font-bold leading-tight tracking-tight text-stone-50 md:text-5xl lg:text-6xl">
            La fatturazione per freelancer,
            <br className="hidden sm:block" />
            <span className="text-blue-400">senza complicazioni.</span>
          </h1>
          <p className="animate-fade-in-up delay-1 mt-6 max-w-2xl text-lg text-stone-400 md:text-xl">
            Fatture, preventivi, report fiscali. Tutto in un unico posto.
            <br className="hidden md:block" />
            Gratis per iniziare.
          </p>
          <div className="animate-fade-in-up delay-2 mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/registrati"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-blue-700"
            >
              Crea il tuo account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#funzionalita"
              className="inline-flex items-center justify-center rounded-lg border border-stone-700 px-8 py-3.5 text-base font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-50"
            >
              Scopri le funzionalit&agrave;
            </a>
          </div>
          <p className="animate-fade-in-up delay-3 mt-6 text-sm text-stone-500">
            Gratis fino a 10 fatture. Nessuna carta richiesta.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="funzionalita" className="scroll-mt-16 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
              Tutto ci&ograve; che serve al tuo business
            </h2>
            <p className="mt-4 text-lg text-stone-500">
              Strumenti pensati per freelancer in Italia e Spagna. Semplici, completi, professionali.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up delay-${i + 1} rounded-2xl border border-stone-200 p-8 transition-colors hover:border-stone-300`}
              >
                <feature.icon className="h-6 w-6 text-stone-500" />
                <h3 className="mt-4 text-lg font-semibold text-stone-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="prezzi" className="scroll-mt-16 bg-stone-50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
              Prezzi semplici, senza sorprese
            </h2>
            <p className="mt-4 text-lg text-stone-500">
              Inizia gratis, passa a Pro quando cresci.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {/* Free plan */}
            <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-8">
              <h3 className="text-lg font-semibold text-stone-900">Free</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-stone-900">
                  &euro;0
                </span>
                <span className="text-sm text-stone-500">/mese</span>
              </div>
              <p className="mt-4 text-sm text-stone-500">
                Perfetto per iniziare. Fino a 10 fatture emesse.
              </p>
              <Link
                href="/registrati"
                className="mt-8 inline-flex items-center justify-center rounded-lg border border-stone-300 px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50"
              >
                Inizia gratis
              </Link>
              <ul className="mt-8 flex-1 space-y-3">
                {sharedFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro plan */}
            <div className="relative flex flex-col rounded-2xl border-2 border-blue-600 bg-white p-8">
              <div className="absolute -top-3.5 left-8">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                  Consigliato
                </span>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-stone-900">
                  &euro;10
                </span>
                <span className="text-sm text-stone-500">/mese</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                oppure &euro;100/anno
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Risparmi &euro;20
                </span>
              </p>
              <p className="mt-4 text-sm text-stone-500">
                Fatture illimitate per professionisti che crescono.
              </p>
              <Link
                href="/registrati"
                className="mt-8 inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Passa a Pro
              </Link>
              <ul className="mt-8 flex-1 space-y-3">
                <li className="flex items-start gap-3 text-sm font-medium text-stone-900">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  Fatture illimitate
                </li>
                {sharedFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-stone-950 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-stone-50 md:text-4xl">
            Pronto a semplificare la tua fatturazione?
          </h2>
          <p className="mt-4 text-lg text-stone-400">
            Gratis per sempre fino a 10 fatture.
          </p>
          <Link
            href="/registrati"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            Crea il tuo account gratuito
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <span className="font-display text-base font-semibold text-stone-900">
              fatturami.cloud
            </span>
            <p className="mt-1 text-sm text-stone-500">
              Fatto con cura in Italia.
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              href="/login"
              className="text-sm text-stone-500 transition-colors hover:text-stone-900"
            >
              Accedi
            </Link>
            <Link
              href="/registrati"
              className="text-sm text-stone-500 transition-colors hover:text-stone-900"
            >
              Registrati
            </Link>
          </div>
          <p className="text-sm text-stone-400">
            &copy; 2026 fatturami.cloud
          </p>
        </div>
      </footer>
    </div>
  );
}
