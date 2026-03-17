# Piano: Trasformazione Multi-Tenant SaaS - fatturami.cloud

## Context

L'invoicing system attuale era single-user con zero isolamento dati. Nessun `userId` sui modelli business, Company singleton, query globali senza filtri, logica fiscale hardcoded per la Spagna. In fase di trasformazione in SaaS multi-tenant per freelancer italiani e spagnoli, con auth moderna, billing Stripe, e supporto fatturazione elettronica SDI.

**Decisione chiave dalla ricerca**: Auth.js (NextAuth v5) e' in maintenance-only dal 2025 (il team si e' unito a Better Auth). **Supabase Auth** e' la scelta migliore: magic link + Google + Apple built-in, 50K MAU free, dashboard admin inclusa.

**Competitor principale**: fattureincloud.it (600K+ clienti, TeamSystem). I loro punti deboli: limiti documenti aggressivi, prezzi crescenti, support degradato. La nostra differenziazione: dual-market IT+ES, pricing trasparente (10 fatture free, poi EUR10/mese), nessun limite di consultazione.

---

## Decisioni Architetturali

| Aspetto | Decisione | Motivazione |
|---------|-----------|-------------|
| **Auth** | Supabase Auth | Auth.js e' maintenance-only. Supabase ha magic link + OAuth built-in, 50K MAU free |
| **Database** | Supabase PostgreSQL + Prisma ORM | Hybrid: managed DB + type safety. NO RLS, authorization nei Server Actions |
| **Storage** | Supabase Storage | Sostituisce Docker volume `uploads/`. CDN, 1GB free |
| **Email auth** | Supabase (built-in) | Per magic link e password reset |
| **Email transazionale** | Resend | Per notifiche fatture, promemoria pagamenti |
| **Billing** | Stripe | EUR10/mese o EUR100/anno. Checkout + Customer Portal |
| **SDI** | @palmabit/json2fatturapaxml + Invoicetronic API | XML generation + intermediario SDI accreditato |
| **Multi-tenancy** | userId su ogni modello, filtri nei Server Actions | Semplice, scalabile, nessun RLS da gestire |
| **FIC Import** | xlsx library | Parse XLS exports (summary-level, no line items) |

---

## Fasi di Implementazione

### Fase 0: Migrazione Database a Supabase PostgreSQL — ✅ Completata

**Perche' prima**: Supabase richiede PostgreSQL. Produzione era MySQL. Doveva avvenire prima di qualsiasi evoluzione schema.

- [x] Creare progetto Supabase (regione EU)
- [x] Export dati MySQL da produzione (`mysqldump` o script Prisma)
- [x] Cambiare `provider = "postgresql"` in `schema.prisma`
- [x] Aggiungere `directUrl` per migrazioni Supabase
- [x] Baseline migration per PostgreSQL
- [x] Import dati su Supabase PostgreSQL
- [x] Aggiornare `.env.example` con formato PostgreSQL
- [x] Aggiornare `docker-compose.yml` per dev locale (PostgreSQL)
- [x] Verificare: tutti i record presenti, typecheck passa, tutte le pagine funzionano

**File modificati:** `prisma/schema.prisma`, `.env.example`, `docker-compose.yml`

---

### Fase 1: Supabase Auth (Sostituisce JWT Custom) — ✅ Completata

**Strategia chiave**: `getCurrentUser()` mantiene la stessa interfaccia `{userId, email}`. Internamente usa Supabase session + lookup del User Prisma per supabaseId. Questo minimizza le modifiche ai file actions.

- [x] Installare `@supabase/supabase-js`, `@supabase/ssr`
- [x] Creare `src/lib/supabase/server.ts` (server client factory)
- [x] Creare `src/lib/supabase/client.ts` (browser client)
- [x] Creare `src/lib/supabase/middleware.ts` (session refresh)
- [x] Riscrivere `src/middleware.ts` (Supabase session al posto di JWT)
- [x] Riscrivere `src/lib/auth.ts` (`getCurrentUser()` via Supabase)
- [x] Riscrivere login page (magic link + Google + Apple)
- [x] Creare `/register` page
- [x] Creare `/auth/callback/route.ts` (OAuth redirect handler)
- [x] Aggiornare User model Prisma: +supabaseId, +country, +onboardingComplete, -password
- [x] Migrare utente esistente (giovanni.broegg@pm.me) in Supabase Auth
- [x] Rimuovere changePassword da impostazioni
- [x] Rimuovere dipendenze `bcryptjs`, `jose`
- [x] Verificare: login magic link funziona, getCurrentUser() ritorna userId corretto, tutte le pagine caricano

**File modificati:** `src/lib/auth.ts`, `src/middleware.ts`, `src/app/login/*`, `prisma/schema.prisma`, `package.json`
**File nuovi:** `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/app/register/*`, `src/app/auth/callback/route.ts`

Dettagli: vedi `tasks/phase1-supabase-auth.md`

---

### Fase 2: Isolamento Tenant (userId su Tutti i Modelli) — ✅ Completata

**Core del multi-tenancy. Tocca OGNI query in OGNI file actions.**

**Query aggiornate con userId (lista completa):**

| File | Funzioni aggiornate |
|------|----------------------|
| `fatture/actions.ts` | getClientsForInvoice, getTaxRatesForInvoice, getInvoices, getInvoice, updateInvoiceStatus, deleteInvoice, addPayment, deletePayment, createInvoice |
| `preventivi/actions.ts` | getClientsForSelect, getTaxRates, getQuotes, updateQuoteStatus, deleteQuote, createQuote |
| `note-credito/actions.ts` | getInvoiceForCreditNote, getCreditNotes, deleteCreditNote, createCreditNote |
| `acquisti/actions.ts` | getSuppliersForSelect, getTaxRates, getPurchaseInvoices, getPurchaseInvoice, deletePurchaseInvoice |
| `spese/actions.ts` | getExpenses, deleteExpense, createExpense |
| `anagrafiche/clienti/actions.ts` | getClients, getClient, createClient, updateClient, deleteClient |
| `anagrafiche/fornitori/actions.ts` | getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier |
| `impostazioni/actions.ts` | getCompany, saveCompany, getCompanyCountry |
| `dashboard/actions.ts` | getDashboardData (7 query parallele) |
| `fiscale/iva/actions.ts` | getVATReport (3 query) |
| `fiscale/irpf/actions.ts` | getIRPFReport (3 query per trimestre) |
| `import/csv/actions.ts` | importCSV |
| `import/pdf/actions.ts` | AI extraction import |
| `api/pdf/*/route.ts` | 3 PDF API routes |

**Schema changes eseguiti:**
- Aggiunto `userId String` + `@relation` a: Company, Client, Supplier, Invoice, Quote, CreditNote, PurchaseInvoice, Expense
- Cambiato UNIQUE su document numbers: `@@unique([userId, number])` su Invoice, Quote, CreditNote
- TaxRate resta CONDIVISO (no userId) - filtrato per country
- Payment eredita isolamento via Invoice (no userId diretto)

- [x] Creare `src/lib/authorization.ts` con helper `requireUser()` e `scopedWhere()`
- [x] Migrazione Prisma: aggiungere userId a 8 modelli
- [x] Script data migration: assegnare tutti i record a giovanni.broegg@pm.me
- [x] Aggiornare TUTTE le query in TUTTI i 14 file actions
- [x] Aggiornare le 3 PDF API routes
- [x] Aggiornare `generateDocumentNumber` call sites (filtrare per userId nel findLast)
- [x] Grep sistematico: ogni chiamata Prisma business ha userId
- [x] Verificare: typecheck passa, utente esistente vede stessi dati, nuovo utente vede stato vuoto

Dettagli: vedi `tasks/phase2-tenant-isolation.md`

---

### Fase 3: Onboarding + Sistema Fiscale per Paese — ✅ Completata

**Onboarding flow implementato:**
1. Seleziona paese (IT / ES) con bandiere
2. Inserisci P.IVA (IT: 11 cifre) o NIF (ES: formato spagnolo)
3. Compila dati azienda (nome, indirizzo, IBAN)
4. Seleziona regime fiscale:
   - Italia: "Forfettario" (flat 15%/5%) o "Ordinario" (IRPEF scaglioni)
   - Spagna: "Autonomo" (default attuale)
5. `user.onboardingComplete = true`, crea record Company, redirect a `/`

**Fiscal Strategy Pattern implementato:**

```
src/lib/fiscal/
  index.ts      -- interfaccia FiscalStrategy
  factory.ts    -- getFiscalStrategy(country)
  spain.ts      -- IRPF brackets, Modelo 303, NIF validation, disclaimers spagnoli
  italy.ts      -- IRPEF brackets, forfettario, liquidazione IVA, P.IVA validation, disclaimers italiani
```

**Logica estratta dalla codebase:**
- IRPF brackets da `fiscale/irpf/actions.ts`
- VAT report logic da `fiscale/iva/actions.ts`
- Disclaimer generation da `fatture/actions.ts`
- NIF regex da `impostazioni/actions.ts`

**Aggiunto per Italia:**
- IRPEF 2024: 23% fino 28K, 25% 28-50K, 35% 50-100K, 43% oltre 100K
- Forfettario: 15% flat (5% primi 5 anni, campo `annoAperturaPIVA`)
- Disclaimer forfettario: "Operazione effettuata ai sensi dell'art.1, commi 54-89, L.190/2014"
- P.IVA validation: `/^\d{11}$/`
- Tax rates IT: 22% standard, 10% ridotta, 4% super-ridotta, 0% forfettario

- [x] Creare onboarding page + form + actions
- [x] Guard in middleware/layout: redirect a /onboarding se !onboardingComplete
- [x] Creare fiscal strategy pattern (4 file)
- [x] Refactor report IRPF/IRPEF per usare strategy
- [x] Refactor report IVA per usare strategy
- [x] Refactor disclaimer generation
- [x] Seed tax rates italiane nel DB
- [x] Sidebar dinamica per labels fiscali (IRPF vs IRPEF, Modelo 303 vs Liquidazione IVA)
- [x] Aggiungere enum TaxRegime a Prisma (autonomo, forfettario, ordinario)
- [x] Verificare: onboarding completo per utente IT e ES, report fiscali corretti per entrambi i paesi

Dettagli: vedi `tasks/phase3-onboarding-fiscal.md`

---

### Fase 4: Supabase Storage + File Viewing — ✅ Completata

**Feature differenziante per acquisire utenti italiani che migrano da fattureincloud.it.**

**Export fattureincloud.it analizzati (cartella "Fatture in cloud"):**
- `Fatture_YYYY.xls` (2015-2025): ~400 fatture, 28 colonne, formato summary (no righe dettaglio)
- `NC_YYYY.xls` (2019-2025): ~16 note credito, 26 colonne
- `Preventivi_2025.xls`: 3 preventivi, 21 colonne
- `Lista_Clienti.xlsx`: 84 clienti, 26 colonne

**Strategia import summary-level**: siccome gli export non hanno righe dettaglio, creare una riga singola per fattura con Description="Importato da Fatture in Cloud", Qty=1, UnitPrice=Imponibile, TaxRate derivata dalla colonna IVA.

- [x] Installare `xlsx` per parsing XLS/XLSX
- [x] Configurare Supabase Storage (bucket `uploads` / `documents`, policies per userId prefix)
- [x] Creare `src/lib/supabase/storage.ts` (upload, getUrl, delete)
- [x] Migrare upload acquisti/spese da filesystem a Supabase Storage
- [x] Creare parser XLS: `src/lib/import/fattureincloud-parser.ts`
- [x] Creare wizard import: `/import/fattureincloud/` (upload -> detect -> preview -> import -> summary)
- [x] Gestire dedup per numero documento
- [x] Auto-creazione clienti dalla colonna Cliente
- [x] Verificare: import fatture + clienti, conteggi corretti, nessun duplicato

Dettagli: vedi `tasks/phase4-supabase-storage.md`

---

### Fase 5: Stripe Billing + Limite Fatture — ✅ Completata

**Regole implementate:**
- Free tier: 10 fatture EMESSE (status "emessa" in poi). Draft illimitate.
- Dopo 10: puo' accedere, consultare, modificare bozze, ma NON emettere nuove fatture
- Pro: EUR10/mese o EUR100/anno (sconto EUR20)

- [x] Installare `stripe`, `@stripe/stripe-js`
- [x] Creare prodotti Stripe (Monthly + Annual)
- [x] Aggiungere modello Subscription a Prisma
- [x] Creare `src/lib/billing.ts` (canEmitInvoice, getEmittedCount, incrementCount)
- [x] Gate su `updateInvoiceStatus` quando transizione a "emessa"
- [x] Webhook handler `/api/stripe/webhook/route.ts`
- [x] Billing dashboard `/abbonamento/` (piano attuale, conteggio, upgrade, gestisci)
- [x] UI prompt upgrade quando limite raggiunto
- [x] Verificare: 10 fatture emesse OK, 11esima bloccata, pagamento Stripe sblocca, cancellazione torna a free

**Modello Subscription:**
```
id, userId (unique), stripeCustomerId, stripeSubscriptionId,
status (free/active/past_due/canceled), currentPeriodEnd, createdAt, updatedAt
```

Dettagli: vedi `tasks/phase5-stripe-billing.md`

---

### Fase 6: SDI (Fatturazione Elettronica Italiana) — ⬜ Da fare

**Perche' settima**: Feature avanzata, richiede le fasi precedenti complete (specialmente Fase 3 per il supporto fiscale italiano).

**Stack SDI:**
- `@palmabit/json2fatturapaxml` per generazione XML FatturaPA
- `@invoicetronic/ts-sdk` come intermediario SDI (REST API, sandbox gratuita)

**Campi SDI aggiuntivi:**
- Invoice: +sdiStatus, +sdiId, +sdiXmlPath
- Client (IT): +codiceDestinatario (7 char), +pec

- [ ] Installare pacchetti SDI
- [ ] Creare `src/lib/sdi/xml-generator.ts` (Invoice -> FatturaPA XML)
- [ ] Creare `src/lib/sdi/invoicetronic-client.ts` (submit via API)
- [ ] Aggiungere campi SDI a Invoice e Client in Prisma
- [ ] UI per invio SDI nella pagina dettaglio fattura (solo utenti IT)
- [ ] Tracking status SDI (pending -> sent -> accepted/rejected)
- [ ] Webhook per notifiche SDI
- [ ] Verificare: genera XML valido, invio a sandbox Invoicetronic, ricezione notifica

**File nuovi:**
- `src/lib/sdi/xml-generator.ts`
- `src/lib/sdi/invoicetronic-client.ts`
- `src/lib/sdi/sdi-types.ts`

**File da modificare:**
- `prisma/schema.prisma` (campi SDI su Invoice e Client)
- `src/app/(main)/fatture/[id]/page.tsx` (UI invio SDI)

**Rischio**: ALTO - la conformita' XML FatturaPA e' molto restrittiva. Mitigazione: validazione contro XSD ufficiale, test con sandbox Invoicetronic.

Dettagli: vedi `tasks/phase6-sdi.md`

---

### Fase 7: Landing Page + Documentazione Tecnica — ⬜ Da fare

**Landing page:**
- [ ] Creare route group `(public)` per pagine non autenticate
- [ ] Landing page: hero "La fatturazione semplice per freelancer e autonomi", features, pricing
- [ ] Pagina prezzi dettagliata con confronto Free vs Pro
- [ ] CTA "Inizia gratis" -> `/register`
- [ ] Middleware: authenticated -> dashboard, non authenticated -> landing
- [ ] Posizionamento vs fattureincloud.it: nessun limite documenti in consultazione, dual-market IT+ES, pricing trasparente

**Documentazione tecnica (per AI context):**
- [ ] Creare `/docs/architecture.md` (overview sistema, decisioni architetturali, pattern)
- [ ] Creare `/docs/fiscal-strategies.md` (logica fiscale per paese, IRPF/IRPEF/forfettario)
- [ ] Creare `/docs/data-model.md` (schema Prisma annotato con relazioni e invarianti)
- [ ] Creare `/docs/api-reference.md` (server actions per modulo, input/output)
- [ ] Aggiornare CLAUDE.md con nuova architettura multi-tenant

**File nuovi:**
- `src/app/(public)/page.tsx` (landing)
- `src/app/(public)/layout.tsx`
- `src/app/(public)/prezzi/page.tsx`
- `docs/architecture.md`
- `docs/fiscal-strategies.md`
- `docs/data-model.md`
- `docs/api-reference.md`

**File da modificare:**
- `src/middleware.ts` (route pubbliche)
- `CLAUDE.md` (aggiornamento architettura)

---

## Dependency Graph

```
Fase 0 ✅ (DB Migration)
  |
Fase 1 ✅ (Supabase Auth)
  |
Fase 2 ✅ (Tenant Isolation)
  |
  +---> Fase 3 ✅ (Onboarding + Fiscal) ---> Fase 6 ⬜ (SDI)
  |                |
  |                +---> Fase 4 ✅ (FIC Import + Storage)
  |
  +---> Fase 5 ✅ (Stripe Billing)
  |
  +---> Fase 7 ⬜ (Landing + Docs)
```

Fasi 6 e 7 sono parallelizzabili. SDI richiede Fase 3 (supporto fiscale italiano).

---

## Scope Totale

| Fase | Stato | File nuovi | File modificati | Migrazioni | Complessita' |
|------|-------|-----------|----------------|------------|-------------|
| 0 | ✅ | 1 script | 3 | 1 (baseline) | Media |
| 1 | ✅ | 6 | 8 | 1 | Alta |
| 2 | ✅ | 1 | 17 (tutti actions + API) | 1 (grande) | Molto Alta |
| 3 | ✅ | 7 | 6 | 1 | Alta |
| 4 | ✅ | 5 | 3 | 0 | Media |
| 5 | ✅ | 5 | 3 | 1 | Media |
| 6 | ⬜ | 4 | 2 | 1 | Alta |
| 7 | ⬜ | 7 | 2 | 0 | Bassa |

---

## Verifica End-to-End (dopo ogni fase)

**Fase 0**: ✅ Record count match MySQL vs Supabase PG. `npm run typecheck` + `npm run lint` passano. Tutte le pagine caricano.

**Fase 1**: ✅ Login magic link funziona. `getCurrentUser()` ritorna Prisma User.id (non Supabase UUID). OAuth Google funziona. Registrazione crea nuovo utente. Logout funziona.

**Fase 2**: ✅ Grep sistematico: nessuna query business senza userId (escludendo TaxRate). Utente esistente vede stessi dati. Secondo utente test vede stato vuoto. Accesso cross-tenant ritorna 404.

**Fase 3**: ✅ Nuovo utente IT completa onboarding con P.IVA. Report IRPEF mostra scaglioni italiani. Disclaimer forfettario appare su fattura IT. Utente ES non vede cambiamenti.

**Fase 4**: ✅ Import XLS da "Fatture in cloud" crea fatture + clienti. Re-import stesso file non crea duplicati. File upload usa Supabase Storage.

**Fase 5**: ✅ 10 fatture emesse OK. L'11esima emissione bloccata con prompt upgrade. Pagamento Stripe sblocca. Cancellazione torna a free tier (dati conservati).

**Fase 6**: ⬜ Generare XML FatturaPA per una fattura IT. Validare XML contro XSD. Invio a sandbox Invoicetronic ritorna sdiId.

**Fase 7**: ⬜ Utente non autenticato vede landing page. Utente autenticato vede dashboard. Docs leggibili e utili per AI context.

---

## Costo Mensile Stimato (Produzione)

| Servizio | Costo |
|----------|-------|
| Supabase Pro | $25/mese |
| Resend (email) | $20/mese (50K email) |
| Ploi hosting | ~$10-20/mese |
| Stripe fees | 2.9% + 30c per transazione |
| **Totale** | **~$75-85/mese** |

---

## Analisi Competitiva: fattureincloud.it

**Pricing competitor (2026, IVA esclusa):**
| Piano | Prezzo | Documenti/anno | Contatti |
|-------|--------|---------------|----------|
| Forfettari | 4 EUR/mese | 100 | 500 |
| Standard | 12 EUR/mese | 100 | 500 |
| Premium | 21 EUR/mese | 400 | 1,000 |
| Premium Plus | 29 EUR/mese | 800 | 2,500 |
| Complete | 51 EUR/mese | 3,000 | 5,000 |

**Nostri vantaggi:**
1. **Nessun limite documenti** in consultazione (free tier = solo limite emissione)
2. **Dual-market IT + ES** - nessun competitor serve entrambi i mercati
3. **Pricing trasparente**: 10 fatture free, poi EUR10/mese flat (no limiti documenti/contatti)
4. **AI-powered import** (Claude vision per estrazione PDF)
5. **Multi-valuta + regime IVA internazionale** gia' implementato
6. **No vendor lock-in**: tool di import da fattureincloud.it incluso

**Punti deboli competitor (da Trustpilot/Capterra):**
- Limiti documenti ridotti retroattivamente nel 2026
- Prezzi in costante aumento dal 2018
- Support chat rimosso, sostituito da ticket lenti
- Rinnovo automatico anche dopo chiusura attivita'
