## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Non inventare nomi di variabili, funzioni, classi o altro, verifica sempre la loro esistenza prima di usarle
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When I report a bug, don't start by trying to fix it. Instead, start by writing a test that reproduces the bug. Then, have subagents try to fix the bug and prove it with a passing test.
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.

## Project Context

### What This Is
**Invoicing System** — Sistema di fatturazione web per freelancer/autonomo spagnolo che opera a livello internazionale (IT, UK, EU, extra-EU). Gestione completa del ciclo di fatturazione, preventivi, note di credito, acquisti, spese e report fiscali (IVA/IRPF).

### Tech Stack
- **Framework:** Next.js 16.1.4, React 19.2.3, TypeScript 5.9.3 (strict mode)
- **Database:** PostgreSQL 16 (Docker), Prisma 6.19.2 ORM
- **Styling:** Tailwind CSS 4.1.18, PostCSS
- **Auth:** JWT via jose 6.1.3, bcryptjs 3.0.3 (httpOnly cookies, HS256, 7d expiry)
- **PDF:** @react-pdf/renderer 4.3.2 (multi-lingua)
- **Validation:** Zod 4.3.6
- **AI:** @anthropic-ai/sdk 0.71.2 (estrazione dati da PDF via vision)
- **Charts:** Recharts 3.7.0
- **Import:** PapaParse 5.5.3 (CSV parsing)
- **Containerization:** Docker multi-stage (node:20-alpine), Docker Compose
- **Quality:** ESLint 9.39.2, TypeScript strict mode (no test framework)

### Module Map (dependency order)
| Route | Modulo | Scopo | Status |
|-------|--------|-------|--------|
| — | Infrastruttura | Auth JWT, middleware, Prisma client, layout con Sidebar | ✅ Done |
| `/impostazioni` | Impostazioni | Dati azienda (NIF, IBAN, regime fiscale), cambio password | ✅ Done |
| `/anagrafiche/clienti` | Clienti | Anagrafica clienti, regime IVA, valuta, validazione VIES | ✅ Done |
| `/anagrafiche/fornitori` | Fornitori | Anagrafica fornitori, categoria spesa default | ✅ Done |
| `/preventivi` | Preventivi | Creazione preventivi, righe con aliquote, conversione a fattura | ✅ Done |
| `/fatture` | Fatture | Fatture emesse, numerazione progressiva, multi-valuta, disclaimer IVA | ✅ Done |
| `/note-credito` | Note Credito | Note di credito legate a fatture esistenti | ✅ Done |
| `/acquisti` | Acquisti | Fatture fornitore, upload file, deducibilità per riga | ✅ Done |
| `/spese` | Spese | Spese generiche per categoria, importo IVA, deducibilità | ✅ Done |
| `/import/csv` | Import CSV | Wizard multi-step: upload → mapping → preview → import | ✅ Done |
| `/import/pdf` | Import PDF | Import batch PDF con estrazione AI (Anthropic vision) | ✅ Done |
| `/fiscale/iva` | Report IVA | Report IVA trimestrale (Modelo 303), aggregazione per aliquota | ✅ Done |
| `/fiscale/irpf` | Report IRPF | Report IRPF, spese deducibili per periodo | ✅ Done |
| `/dashboard` | Dashboard | Metriche periodo (mese/trimestre/anno), grafici Recharts | ✅ Done |
| `/api/pdf/*` | PDF API | Generazione PDF fatture, preventivi, note credito | ✅ Done |
| `/api/extract` | Estrazione AI | OCR/estrazione dati da PDF/immagini via Claude vision | ✅ Done |

### Architecture Patterns
- **App Router:** Next.js App Router con route group `(main)` per rotte protette, `login` pubblica
- **Server Actions:** logica backend in `actions.ts` con direttiva `"use server"`, Prisma diretto (no service layer)
- **CUID PKs:** `@default(cuid())` su tutti i modelli Prisma
- **Soft deletes:** campo `deletedAt` su Client e Supplier
- **Cascade deletes:** righe documento (InvoiceLine, QuoteLine, etc.) cancellate in cascata
- **Singleton Prisma:** `lib/prisma.ts` con global singleton in dev per evitare pool exhaustion
- **Validazione Zod:** schema validation server-side con `safeParse()`, errori strutturati `{ success, errors, message }`
- **Enums string-backed:** `VatRegime`, `InvoiceStatus`, `QuoteStatus`, `ExpenseCategory`, `TaxRateType` nel Prisma schema
- **Stato transizioni:** oggetti `statusTransitions` per vincolare i cambi di stato (es. bozza → emessa → pagata)
- **Middleware JWT:** `middleware.ts` verifica token su ogni richiesta, redirect a `/login` se invalido
- **Conversione documenti:** Quote → Invoice (da status "accettato"), Invoice → CreditNote (tramite referenceInvoice)
- **PDF React-based:** `@react-pdf/renderer` con componenti React, supporto multi-lingua via `translations.ts`
- **Nessun state management globale:** stato locale con `useState`, nessun Redux/Context/Zustand

### Key Invariants (NEVER violate)
1. **Numeri documento unici** — Invoice.number, Quote.number, CreditNote.number hanno vincolo UNIQUE
2. **Note credito legate a fattura** — ogni CreditNote DEVE avere un invoiceId valido
3. **No delete fattura con note credito** — se `creditNotes.length > 0`, la fattura non è cancellabile
4. **Transizioni stato vincolate** — solo transizioni definite in `statusTransitions` (es. bozza→emessa, MAI pagata→bozza)
5. **Conversione preventivo one-way** — Quote passa a "convertito" e genera fattura, MAI il contrario
6. **Regime IVA determina disclaimer** — il disclaimer fattura è derivato dal `vatRegime` del cliente, non editabile liberamente
7. **Soft delete su anagrafiche** — Client e Supplier usano `deletedAt`, MAI hard delete
8. **VIES solo per paesi EU** — validazione VAT VIES solo per regime intraUE, graceful fallback se servizio non disponibile
9. **Password hash bcrypt 12 rounds** — MAI salvare password in chiaro, usare sempre `hashPassword()`

### Coding Conventions
- Page (lista): `src/app/(main)/{modulo}/page.tsx` — async Server Component, `export const dynamic = "force-dynamic"`
- Page (crea): `src/app/(main)/{modulo}/nuova/page.tsx` o `nuovo/page.tsx`
- Page (dettaglio): `src/app/(main)/{modulo}/[id]/page.tsx`
- Page (modifica): `src/app/(main)/{modulo}/[id]/modifica/page.tsx`
- Server Actions: `src/app/(main)/{modulo}/actions.ts` — direttiva `"use server"`, tipi e Zod schemas nello stesso file
- Client Component: `src/app/(main)/{modulo}/NomeComponente.tsx` — PascalCase, direttiva `"use client"`
- Componenti condivisi: `src/components/NomeComponente.tsx`
- Utilities: `src/lib/{nome}.ts` (auth, prisma, vies)
- PDF: `src/lib/pdf/InvoicePDF.tsx` + `translations.ts`
- API routes: `src/app/(main)/api/{nome}/route.ts`
- Import path alias: `@/*` → `./src/*`
- Type import: `import { type NomeTipo } from "./actions"`
- Return type actions: `{ success: boolean; errors?: Record<string, string[]>; message?: string }`
- Errori form: helper `fieldError(field)` che ritorna `result?.errors?.[field]?.[0]`
- Navigazione post-submit: `router.push()` on success, `setResult(res)` on failure
- Decimal da Prisma: convertire con `Number(value)` per il rendering
- Paginazione: URL params `?page=N&search=Q`, Prisma `skip`/`take`, `Promise.all([findMany, count])`

### PRD & Task Files
- PRD: `tasks/prd-invoicing-system.md` (spec completa con 17 user stories US-001–US-017)
- Lessons: `tasks/lessons.md` (pattern e correzioni apprese)
- Todo: `tasks/todo.md` (task correnti con checkbox)
- Scripts import: `scripts/import-*.ts` (import dati da CSV/directory con Prisma)
- Skills Claude: `.claude/skills/ralph/SKILL.md` (conversione PRD → JSON), `.claude/skills/prd/SKILL.md` (generazione PRD)

## Installed Skills — Uso Autonomo

Le seguenti skill sono installate globalmente in `~/.claude/skills/` e DEVONO essere consultate automaticamente in base al contesto della richiesta. Non aspettare che l'utente le menzioni esplicitamente.

### Mapping Skill → Contesto di Attivazione

| Skill | Quando Usarla |
|-------|--------------|
| `vercel-react-best-practices` | Ogni volta che scrivi/modifichi componenti React, pagine Next.js, data fetching, ottimizzazione performance, bundle size |
| `nextjs-app-router-patterns` | Quando lavori con App Router: route, layout, Server Components, Server Actions, streaming, parallel routes |
| `typescript-advanced-types` | Quando crei tipi complessi, generics, utility types, type guards, o migliori type safety |
| `prisma-database-setup` | Quando modifichi schema Prisma, query, relazioni, migrazioni, o troubleshooting DB |
| `typescript-react-reviewer` | Prima di concludere qualsiasi modifica React/TS: auto-review per anti-pattern, state management, useEffect abuse, Rules of Hooks |
| `typescript-e2e-testing` | Quando scrivi test, configuri testing infra, o l'utente chiede di testare funzionalità |
| `secure-code-guardian` | Quando tocchi auth, input validation, gestione password, JWT, o qualsiasi superficie di attacco OWASP Top 10 |
| `tailwind-css-patterns` | Quando stili componenti, layout responsive, design system, spacing, tipografia, dark mode |
| `shadcn-ui` | Quando crei/modifichi componenti UI, form, tabelle, dialog, select, toast — usa SEMPRE componenti shadcn/ui se disponibili |

### Regole di Applicazione

1. **Applica silenziosamente** — Non dire "sto consultando la skill X". Applica le best practice direttamente nel codice.
2. **Multi-skill** — Se una task tocca più aree (es. un form con validazione Zod + Tailwind + Server Action), consulta TUTTE le skill rilevanti.
3. **Auto-review obbligatorio** — Prima di dichiarare completata qualsiasi modifica a componenti React/TypeScript, esegui mentalmente una review usando i criteri di `typescript-react-reviewer` (anti-pattern critici, useEffect abuse, type safety).
4. **Security-first** — Quando la modifica tocca auth, form input, o API endpoints, applica SEMPRE i pattern di `secure-code-guardian` come check aggiuntivo.
5. **Performance by default** — Applica `vercel-react-best-practices` su ogni componente: evita waterfall, ottimizza bundle, preferisci Server Components quando possibile.

## Server & Infrastructure

### Containerizzazione (Docker)
- **Dockerfile:** Multi-stage build (node:20-alpine → deps → builder → runner)
- **Docker Compose:** PostgreSQL 16-alpine (porta 5432) + Next.js app (porta 3000)
- **Volumi:** `postgres_data` (persistenza DB), `uploads` (file caricati)
- **Next.js output:** `standalone` mode per immagine Docker ottimizzata
- **Utente:** non-root `nextjs:nodejs` nel container runner

### Git
- **Repo locale:** `/Users/igianni84/Desktop/invoicing-system` (nessun remote configurato)
- **Branch principale:** `main`
- **Branch sviluppo:** `ralph/invoicing-system`
- **Convenzione commit:** semantic (`feat:`, `docs:`, `fix:`) con riferimento user story (es. `feat: US-034 - VIES VAT number validation`)

### Known Gotchas
- `ANTHROPIC_API_KEY` presente in `.env.example` ma non in `.env` — necessario aggiungerlo per le feature AI
- Prisma Decimal: i campi `Decimal` vanno convertiti con `Number()` lato client, altrimenti errori di serializzazione
- `searchParams` e `params` nelle pagine Next.js 16 sono `Promise` — devono essere `await`-ati
- Dev server: `npm run dev` sulla porta 3000, configurato anche in `.claude/launch.json`
- Seeding DB: `npx prisma db seed` usa `tsx prisma/seed.ts`
- Migrazioni Prisma: 3 migrazioni (`create_core_entities`, `add_user_model`, `add_vies_validation_fields`)
- Directory `INCASSI/` e `SPESE/` contengono dati sorgente per import — non committare
- Directory `uploads/` per file caricati (fatture acquisto, spese) — persistita via Docker volume
- Nessun framework di test configurato — verificare via typecheck (`npm run typecheck`) e ESLint (`npm run lint`)