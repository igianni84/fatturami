# Phase 3 — Onboarding + Sistema Fiscale IT/ES

> Status: ✅ Completata (2026-03-16)
> Salvato da `.claude/plans/humming-marinating-ember.md`

## Context

Phases 0-2 (PostgreSQL migration, Supabase Auth, tenant isolation) are complete. The app currently works only for Spanish freelancers — all fiscal reports, tax rates, disclaimers, and regime options are hardcoded to Spain. Phase 3 adds Italian support and a mandatory onboarding wizard so new users configure their country/company before accessing the app.

**Goal**: Any new user picks IT or ES at signup, sees country-appropriate fields, tax rates, disclaimers, and fiscal reports.

---

## Implementation Plan

### Step 1: Schema + Seed

**Prisma schema changes** (`prisma/schema.prisma`):
- Add `minimum` to `TaxRateType` enum (for IT 5%)
- Add 3 optional fields to `Company`: `fiscalCode String @default("")`, `sdiCode String @default("")`, `pec String @default("")`
- Existing data unaffected (all new fields have defaults)

**Seed update** (`prisma/seed.ts`):
- Add Italian tax rates: 22% standard, 10% ridotta, 5% minima, 4% super-ridotta
- Keep existing Spanish rate IDs intact (`seed-standard-ES`, etc.)
- Italian IDs follow same pattern: `seed-standard-IT`, `seed-minimum-IT`, etc.

**Migration**: Single `npx prisma migrate dev --name phase3_onboarding_it_es`

### Step 2: Onboarding Flow

**New files**:
- `src/app/onboarding/layout.tsx` — minimal layout (no sidebar), auth required
- `src/app/onboarding/page.tsx` — server component, redirects to `/` if company exists
- `src/app/onboarding/OnboardingWizard.tsx` — 3-step client wizard
- `src/app/onboarding/actions.ts` — `completeOnboarding()` with Zod discriminated union on country

**Wizard steps**:
1. Country selection (IT/ES) — two large cards
2. Company details — fields adapt to country (NIF vs Partita IVA, Codice Fiscale, SDI, PEC)
3. Fiscal regime — ES: autonomo/sociedad/cooperativa; IT: forfettario/ordinario/semplificato

**Onboarding gate** — refactor `src/app/(main)/layout.tsx`:
- Extract current client component to `src/app/(main)/AppShell.tsx`
- New `layout.tsx` becomes Server Component: checks company exists, redirects to `/onboarding` if not
- Passes `companyCountry` to `AppShell` → `Sidebar` for IRPF/IRPEF label

**Middleware** (`src/middleware.ts`):
- Add `/onboarding` to allowed authenticated paths (outside `(main)` route group, so no company gate)

### Step 3: Company Form Refactor

**Files**: `src/app/(main)/impostazioni/actions.ts`, `CompanyForm.tsx`

- Country becomes **read-only** after onboarding (displayed as badge, not editable)
- Validation uses Zod discriminated union (same schema as onboarding)
- Form conditionally shows IT fields (fiscalCode, sdiCode, pec) or ES fields
- NIF label: "NIF/CIF" (ES) vs "Partita IVA" (IT)
- Regime options: country-specific dropdown
- `getCompany()` returns new fields; `saveCompany()` ignores country changes

### Step 4: Tax Rate Filtering

**New file**: `src/lib/tax-rates.ts` — `getTaxRatesForCountry()`
- Filters by `company.country` + shared rates ("EU", "EXTRA-EU")
- Returns same shape as existing `getTaxRates` functions

**Files updated** (replace local `taxRate.findMany` with `getTaxRatesForCountry()`):
- `src/app/(main)/fatture/actions.ts` — `getTaxRatesForInvoice()`
- `src/app/(main)/preventivi/actions.ts` — `getTaxRates()`
- `src/app/(main)/acquisti/actions.ts` — `getTaxRates()`
- `src/app/(main)/note-credito/actions.ts` — tax rate query
- `src/app/(main)/import/csv/actions.ts` — `taxRate.findMany()`
- `src/app/(main)/import/pdf/actions.ts` — `taxRate.findMany()`

### Step 5: Disclaimer Refactor

**New file**: `src/lib/disclaimers.ts` — `generateDisclaimer({ companyCountry, vatRegime, hasValidVat })`
- Spanish: references Ley 37/1992
- Italian: references DPR 633/72, DL 331/93, Art. 8

**Files updated** (replace local `generateDisclaimer`):
- `src/app/(main)/fatture/actions.ts` — `createInvoice()`, `convertQuoteToInvoice()`
- `src/app/(main)/import/csv/actions.ts` — CSV import disclaimer generation

### Step 6: Fiscal Reports Country Branching

**IVA Report** (`src/app/(main)/fiscale/iva/`):
- `actions.ts`: Add `companyCountry` to `VATReportData`; data queries unchanged (they're country-agnostic)
- `VATReport.tsx`: Branch labels — "Modelo 303" / "IVA Repercutida" (ES) vs "Liquidazione IVA" / "IVA a debito" (IT)

**IRPF/IRPEF Report** (`src/app/(main)/fiscale/irpf/`):
- `actions.ts`: Add Italian IRPEF brackets (23%/35%/43%); parameterize `calculateIRPF()` to accept brackets; add `companyCountry` to response
- `IRPFReport.tsx`: Branch labels — "IRPF (Modelo 130)" vs "IRPEF (Acconti trimestrali)"

**Sidebar** (`src/components/Sidebar.tsx`):
- Accept `companyCountry` prop from `AppShell`
- Show "IRPF" (ES) or "IRPEF" (IT) in nav

---

## Files Summary

| Action | File | What |
|--------|------|------|
| MODIFY | `prisma/schema.prisma` | Add `minimum` enum, 3 Company fields |
| MODIFY | `prisma/seed.ts` | Add Italian tax rates |
| CREATE | `src/app/onboarding/layout.tsx` | Minimal auth-only layout |
| CREATE | `src/app/onboarding/page.tsx` | Server entry (redirect if company exists) |
| CREATE | `src/app/onboarding/OnboardingWizard.tsx` | 3-step wizard |
| CREATE | `src/app/onboarding/actions.ts` | `completeOnboarding()` |
| MODIFY | `src/app/(main)/layout.tsx` | Server Component with company gate |
| CREATE | `src/app/(main)/AppShell.tsx` | Extracted client layout |
| MODIFY | `src/middleware.ts` | Allow `/onboarding` path |
| MODIFY | `src/app/(main)/impostazioni/actions.ts` | Country-aware validation |
| MODIFY | `src/app/(main)/impostazioni/CompanyForm.tsx` | Conditional fields |
| CREATE | `src/lib/tax-rates.ts` | Shared `getTaxRatesForCountry()` |
| CREATE | `src/lib/disclaimers.ts` | Country-aware disclaimers |
| MODIFY | `src/app/(main)/fatture/actions.ts` | Use shared tax rates + disclaimers |
| MODIFY | `src/app/(main)/preventivi/actions.ts` | Use shared tax rates |
| MODIFY | `src/app/(main)/acquisti/actions.ts` | Use shared tax rates |
| MODIFY | `src/app/(main)/note-credito/actions.ts` | Use shared tax rates |
| MODIFY | `src/app/(main)/import/csv/actions.ts` | Use shared tax rates + disclaimers |
| MODIFY | `src/app/(main)/import/pdf/actions.ts` | Use shared tax rates |
| MODIFY | `src/app/(main)/fiscale/iva/actions.ts` | Add `companyCountry` |
| MODIFY | `src/app/(main)/fiscale/iva/VATReport.tsx` | Country-aware labels |
| MODIFY | `src/app/(main)/fiscale/irpf/actions.ts` | IRPEF brackets, parameterize |
| MODIFY | `src/app/(main)/fiscale/irpf/IRPFReport.tsx` | Country-aware labels |
| MODIFY | `src/components/Sidebar.tsx` | Accept `companyCountry` prop |

---

## Verification

- [x] `npx prisma migrate dev` — migration succeeds
- [x] `npx prisma db seed` — Italian + Spanish rates seeded
- [x] `npm run typecheck` — zero errors
- [x] `npx eslint 'src/**/*.{ts,tsx}'` — zero errors
- [x] Manual test: register new user → forced to `/onboarding` → complete wizard with IT → dashboard
- [x] Manual test: existing ES user → no onboarding, settings show ES fields, fiscal reports show Spanish labels
- [x] Manual test: create invoice as IT user → correct Italian disclaimer, only IT tax rates available
- [x] Manual test: IVA report shows "Liquidazione IVA" (IT) or "Modelo 303" (ES)
- [x] Manual test: IRPF page shows correct brackets (3 IT vs 5 ES)
