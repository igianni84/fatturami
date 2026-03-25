import Link from "next/link";
import {
  FileText,
  Calculator,
  Upload,
  Coins,
  BarChart3,
  Users,
  ArrowRight,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import Logo from "@/components/Logo";
import PricingSection from "./PricingSection";

const features = [
  {
    icon: FileText,
    title: "Fatturazione completa",
    description:
      "Fatture, preventivi e note di credito con numerazione automatica e PDF professionali pronti all'invio.",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Calculator,
    title: "Report fiscali automatici",
    description:
      "IVA trimestrale, IRPEF e IRPF calcolati automaticamente. Sempre pronti per il commercialista.",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: Upload,
    title: "Import intelligente con AI",
    description:
      "Importa fatture da PDF con intelligenza artificiale, CSV o XLS. Riconosce i dati automaticamente.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: Coins,
    title: "Multi-valuta",
    description:
      "Fattura in EUR, USD, GBP e altre valute con conversione automatica per i report fiscali.",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Dashboard interattiva",
    description:
      "Grafici e metriche per monitorare fatturato, incassi e spese in tempo reale.",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: Users,
    title: "Anagrafica completa",
    description:
      "Gestisci clienti e fornitori con validazione VIES per partite IVA intracomunitarie.",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
];

const steps = [
  {
    title: "Registrati gratis",
    description:
      "Crea il tuo account in pochi secondi. Nessuna carta di credito richiesta.",
  },
  {
    title: "Configura il profilo",
    description:
      "Inserisci i dati della tua attivit\u00e0, i clienti e le aliquote IVA.",
  },
  {
    title: "Inizia a fatturare",
    description:
      "Crea fatture professionali, genera PDF e monitora il tuo business.",
  },
];

const trustPoints = [
  {
    icon: Shield,
    title: "Conforme alla normativa",
    description:
      "IVA, IRPEF e IRPF calcolati in automatico. Pronto per Italia e Spagna.",
  },
  {
    icon: Zap,
    title: "Import con AI",
    description:
      "Estrai dati dalle fatture PDF in automatico con intelligenza artificiale.",
  },
  {
    icon: Globe,
    title: "Multi-lingua e multi-valuta",
    description:
      "Genera PDF in pi\u00f9 lingue. Fattura in EUR, USD, GBP e altre valute.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo textClassName="text-white" />
          <div className="flex items-center gap-6">
            <a
              href="#funzionalita"
              className="hidden text-sm text-slate-400 transition-colors hover:text-white sm:block"
            >
              Funzionalit&agrave;
            </a>
            <a
              href="#come-funziona"
              className="hidden text-sm text-slate-400 transition-colors hover:text-white md:block"
            >
              Come funziona
            </a>
            <a
              href="#prezzi"
              className="hidden text-sm text-slate-400 transition-colors hover:text-white sm:block"
            >
              Prezzi
            </a>
            <Link
              href="/login"
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Accedi
            </Link>
            <Link
              href="/registrati"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Inizia gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 pb-24 pt-20 md:pb-32 md:pt-28 lg:pb-40 lg:pt-36">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-indigo-500/10 blur-[100px]" />
        {/* Grain texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1fr_380px]">
          {/* Content */}
          <div>
            <h1 className="animate-fade-in-up font-display text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
              La fatturazione per freelancer,
              <br className="hidden sm:block" />
              <span className="text-blue-400">senza complicazioni.</span>
            </h1>
            <p className="animate-fade-in-up delay-1 mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              Fatture, preventivi, report fiscali IVA e IRPEF. Tutto in un unico
              posto. Pensato per freelancer in Italia e Spagna.
            </p>
            <div className="animate-fade-in-up delay-2 mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/registrati"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-blue-500"
              >
                Crea il tuo account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#funzionalita"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-8 py-3.5 text-base font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
              >
                Scopri le funzionalit&agrave;
              </a>
            </div>
            <p className="animate-fade-in-up delay-3 mt-6 text-sm text-slate-500">
              Gratis fino a 10 fatture &mdash; Nessuna carta richiesta
            </p>
          </div>

          {/* Invoice Mockup */}
          <div className="animate-fade-in-up delay-3 relative mx-auto w-full max-w-sm lg:mx-0">
            <div className="animate-float relative z-10 rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                    Fattura #2026-042
                  </p>
                  <p className="mt-1 text-xs text-slate-500">15 mar 2026</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  Pagata
                </span>
              </div>
              <div className="mt-5">
                <p className="text-sm text-slate-400">Mario Rossi S.r.l.</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                  &euro; 4.209,00
                </p>
              </div>
              <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Consulenza IT</span>
                  <span className="text-slate-300">&euro; 2.800,00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hosting annuale</span>
                  <span className="text-slate-300">&euro; 650,00</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-slate-400">IVA 22%</span>
                <span className="text-sm font-medium text-white">
                  &euro; 759,00
                </span>
              </div>
            </div>
            {/* Stacked cards behind */}
            <div className="absolute -bottom-3 -right-3 -z-10 h-full w-full rounded-2xl border border-white/5 bg-white/[0.03]" />
            <div className="absolute -bottom-6 -right-6 -z-20 h-full w-full rounded-2xl border border-white/[0.02] bg-white/[0.01]" />
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-slate-100 bg-white px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3">
          {trustPoints.map((point) => (
            <div key={point.title} className="text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <point.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="funzionalita" className="scroll-mt-16 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Tutto ci&ograve; che serve al tuo business
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Strumenti pensati per freelancer in Italia e Spagna. Semplici,
              completi, professionali.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconColor}`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="come-funziona"
        className="scroll-mt-16 bg-slate-50 px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Come funziona
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Tre semplici passi per iniziare a fatturare.
            </p>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-24 md:py-32">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Pronto a semplificare la tua fatturazione?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Gratis per sempre fino a 10 fatture. Nessuna carta richiesta.
          </p>
          <Link
            href="/registrati"
            className="mt-10 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-blue-500"
          >
            Crea il tuo account gratuito
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <Logo iconClassName="h-6" textClassName="text-base text-slate-900" />
            <p className="mt-1 text-sm text-slate-500">
              Fatto con cura in Italia.
            </p>
          </div>
          <div className="flex gap-8">
            <a
              href="#funzionalita"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Funzionalit&agrave;
            </a>
            <a
              href="#prezzi"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Prezzi
            </a>
            <Link
              href="/login"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Accedi
            </Link>
            <Link
              href="/registrati"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Registrati
            </Link>
          </div>
          <p className="text-sm text-slate-400">
            &copy; 2026 fatturami.cloud
          </p>
        </div>
      </footer>
    </div>
  );
}
