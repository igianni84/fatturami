# Audit Completo - Stato Fix

## Completate

- [x] **SEC-01/03**: Auth check su tutte le API routes e Server Actions mutanti
  - 4 API routes: `api/pdf/invoice`, `api/pdf/quote`, `api/pdf/credit-note`, `api/extract`
  - 7 actions.ts: fatture, preventivi, acquisti, spese, note-credito, clienti, fornitori
- [x] **SEC-02**: XML escaping nei parametri SOAP VIES (`src/lib/vies.ts`)
- [x] **SEC-04**: Fix timing attack login - bcrypt.compare sempre chiamato (`src/app/login/actions.ts`)
- [x] **SEC-05**: File size limit 10MB su upload (`api/extract`, `acquisti/actions.ts`, `spese/actions.ts`)
- [x] **SEC-06**: JWT_SECRET obbligatorio in production (`src/lib/auth.ts`, `src/middleware.ts`)
- [x] **ARCH-02**: State transitions validati server-side (`fatture/actions.ts`, `preventivi/actions.ts`)
- [x] **PERF-01**: Dashboard 7 query parallele con Promise.all (`dashboard/actions.ts`)
- [x] **PERF-06**: PDF routes query parallele (3 PDF route handlers)
- [x] **Verifica**: TypeScript typecheck passa senza errori
- [x] **SEC-09**: Password complexity (min 12 char + maiuscola/minuscola/numero/speciale) — Zod regex + UI hints
  - `impostazioni/actions.ts`: schema con `.min(12)` + 4x `.regex()`
  - `impostazioni/ChangePasswordForm.tsx`: lista requisiti visibile sotto input
- [x] **SEC-10**: Rate limiting API extract — sliding window in-memory (10 req/min per utente)
  - `src/lib/rate-limit.ts`: classe `RateLimiter` con cleanup periodico
  - `api/extract/route.ts`: check dopo auth, 429 con `Retry-After`
- [x] **SEC-15**: Audit logging eventi security (login success/failure, password change)
  - `prisma/schema.prisma`: modello `AuditLog` con indici
  - `src/lib/audit.ts`: helper `logAuditEvent()` (fire-and-forget safe)
  - `login/actions.ts`: log LOGIN_SUCCESS e LOGIN_FAILURE
  - `impostazioni/actions.ts`: log PASSWORD_CHANGE
- [x] **ARCH-05**: JWT middleware error logging — discriminazione errori jose
  - `middleware.ts`: import `errors` da jose, 5 tipi di errore distinti con path
- [x] **ARCH-07**: Soft-deleted client/supplier prevention
  - `fatture/actions.ts`: `deletedAt: null` su createInvoice, getDefaultTaxRateForClient, convertQuoteToInvoice
  - `preventivi/actions.ts`: validazione client prima di createQuote
  - `acquisti/actions.ts`: validazione supplier prima di createPurchaseInvoice
- [x] **Verifica Fase 2**: TypeScript typecheck passa senza errori
- [x] **SEC-16**: Cookie sameSite "strict" (`src/lib/auth.ts`)
  - `sameSite: "lax"` → `sameSite: "strict"` per protezione CSRF completa
- [x] **SEC-17**: Security headers in `next.config.ts`
  - X-Frame-Options: DENY, X-Content-Type-Options: nosniff
  - Referrer-Policy, Permissions-Policy, Content-Security-Policy
- [x] **SEC-18**: Rate limiting su login — 5 tentativi / 15 min per email
  - `src/lib/rate-limit.ts`: aggiunto `loginRateLimiter` singleton
  - `login/actions.ts`: check prima di query utente, log `LOGIN_RATE_LIMITED`
  - `src/lib/audit.ts`: aggiunto tipo `LOGIN_RATE_LIMITED` a `AuditAction`
- [x] **SEC-19**: File type validation con magic bytes + estensione
  - `src/lib/file-validation.ts` (NUOVO): `validateFileType()` e `detectMediaType()`
  - Verifica magic bytes (PDF, JPEG, PNG, GIF, WebP) + whitelist estensioni
  - `api/extract/route.ts`: usa mediaType da magic bytes invece di MIME spoofable
  - `acquisti/actions.ts`: aggiunto `validateFileType()` in `uploadFile()`
  - `spese/actions.ts`: aggiunto `validateFileType()` in `uploadFile()`
- [x] **SEC-20**: Error message sanitization su `/api/extract`
  - Messaggi di errore generici al client, dettagli solo in `console.error`
  - Rimosso leak `rawResponse` nella risposta JSON
- [x] **SEC-21**: Content-Type validation su `/api/extract`
  - Check `multipart/form-data` nel header prima di `request.formData()`
- [x] **Verifica Fase 3**: TypeScript typecheck passa (errori solo in `.next/types` stale)
- [x] **UX-01**: aria-label su bottone icon-only InvoiceList
  - `fatture/InvoiceList.tsx`: `aria-label="Azioni fattura"` su DropdownMenuTrigger Button
- [x] **PERF-07**: Sidebar nav group accessibility
  - `components/Sidebar.tsx`: `role="group"` + `aria-labelledby` su sezioni con children
- [x] **ARCH-03**: useEffect cleanup VATReport + IRPFReport
  - `fiscale/iva/VATReport.tsx`: rimosso `initialYear`/`initialQuarter` da deps, aggiunto cancelled flag + error handling
  - `fiscale/irpf/IRPFReport.tsx`: rimosso `initialYear` da deps, stesso pattern
- [x] **PERF-02**: Dashboard migrazione a URL search params
  - `page.tsx`: accetta `searchParams.period`, validazione whitelist, default "month"
  - `dashboard/Dashboard.tsx`: rimosso useState/useEffect/getDashboardData, usa useRouter + useTransition
  - URL bookmarkable: `/?period=quarter`, `/?period=year`
- [x] **Verifica Fase 4**: TypeScript typecheck passa (errori solo in `.next/types` stale)

## Falsi Positivi (chiusi senza modifiche)

- **PERF-03**: PDF batch import sequenziale — intenzionale per rate limit Anthropic API (commento nel codice)
- **PERF-08**: Stili errore form — già consistenti (`text-sm text-destructive mt-1` in tutti i form)
- **PERF-10**: Debouncing search — search triggered solo su Enter/blur (DataTable), non su keystroke

## Nice-to-Have (Fase 5, bassa priorità)

- [ ] **PERF-04**: Suspense boundaries sulle pagine lista (basso impatto — dati già fetchati server-side)

---

## Audit UX/UI — Piano di Implementazione (COMPLETATO)

### Sprint 1 — Mobile & Fondamenta
- [x] **C1**: Sidebar responsiva con hamburger menu (`Sidebar.tsx`, `layout.tsx`)
- [x] **C2**: Max-width + padding responsive sul layout (`layout.tsx`)
- [x] **B3**: Overflow-x-auto su DataTable per mobile (`DataTable.tsx`)
- [x] **C4**: Warning modifiche non salvate nei form (`useUnsavedChanges` hook + 5 form)

### Sprint 2 — Consistenza
- [x] **A1**: Standardizzare azioni liste su dropdown (QuoteList, CreditNoteList, PurchaseInvoiceList, ExpenseList)
- [x] **A2**: Standardizzare testo bottoni form ("Salva [Entità]" / "Salvataggio..." su tutti i form)
- [x] **C3**: Indicatori `*` su tutti i form required (già presenti — falso positivo)
- [x] **M2**: Placeholder select uniformi (rimossi `--` da InvoiceForm, QuoteForm, CreditNoteForm)

### Sprint 3 — Feedback & Loading
- [x] **A3**: Skeleton loaders al posto di opacity (Dashboard skeleton cards, VATReport/IRPFReport opacity migliorato)
- [x] **A7/B2**: Toast successo/errore — sonner installato, sostituiti 7 `alert()` con `toast.error()`
- [x] **A8**: Validazione file size client-side (10MB check in PurchaseInvoiceForm, ExpenseForm)
- [x] **A6**: Conferma rimozione riga con `window.confirm()` smart (solo se riga ha contenuto)

### Sprint 4 — Feature UX
- [x] **M4**: Breadcrumb navigation (`PageHeader.tsx` + integrato nel layout)
- [x] **M3**: Empty state contestuali (7 liste con messaggi e CTA contestuali)
- [x] **A5**: Export report CSV (`csv-export.ts` utility + bottoni in VATReport e IRPFReport)
- [x] **M7**: Drag-and-drop upload (`FileDropzone.tsx` + integrato in PurchaseInvoiceForm, ExpenseForm, PDFBatchImporter)

### Sprint 5 — Accessibilità & Polish
- [x] **B1**: Accessibilità ARIA (DataTable: role="button"/tabIndex/keyboard su righe cliccabili, role="search", nav aria-label, aria-current="page")
- [x] **A4**: Sidebar migrazione a design system tokens (CSS vars `--sidebar-*` + classi `bg-sidebar`, `text-sidebar-foreground`, etc.)
- [x] **M10**: Badge colori unificati (`status-colors.ts` centralizzato, `scaduto` ora rosso ovunque, rimosso indigo)
- [x] **B6**: Command palette Cmd+K (`CommandPalette.tsx` con shadcn Command, navigazione + azioni rapide)

## Note
- ARCH-01 (QuoteStatus "convertito") era un falso positivo: lo schema Prisma ha gia l'enum corretto
- ESLint ha un errore di configurazione pre-esistente (circular structure nel plugin React)
