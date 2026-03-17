# Fase 1 — Migrazione da JWT Custom a Supabase Auth

> Status: ✅ Completata (2026-03-16)
> Salvato da `.claude/plans/mossy-strolling-candle.md`

## Context

L'app usa un sistema auth custom (JWT via `jose` + `bcryptjs` + cookie httpOnly). Per diventare SaaS multi-tenant serve Supabase Auth: gestione utenti scalabile, registrazione, email confirmation, session refresh automatico. Supabase è solo per auth — i dati app restano su Prisma/PostgreSQL locale.

## Decisioni Architetturali

1. **User model**: aggiungere `supabaseId String @unique`, rimuovere `password` — Supabase gestisce le credenziali
2. **`getCurrentUser()` stessa firma**: ritorna `{ userId, email } | null` → **zero modifiche** ai 23+ file consumer
3. **Auto-provisioning**: se la sessione Supabase è valida ma non esiste un User Prisma, lo crea con `upsert`
4. **Registrazione**: pagina `/registrati` con email + password + conferma email via Supabase
5. **Password change**: `signInWithPassword` per verificare la vecchia + `updateUser` per impostare la nuova

## File Modificati (ordine di esecuzione)

### Step 0 — Dipendenze
```
npm install @supabase/supabase-js @supabase/ssr
npm uninstall jose bcryptjs
npm uninstall -D @types/bcryptjs
```

### Step 1 — Supabase Client Utilities (3 file nuovi)

**`src/lib/supabase/server.ts`** — Server Components + Server Actions
- `createClient()` che usa `createServerClient` da `@supabase/ssr`
- Legge/scrive cookies via `next/headers` `cookies()`

**`src/lib/supabase/middleware.ts`** — Middleware
- `createClient(request)` che ritorna `{ supabase, response }`
- Usa `NextRequest`/`NextResponse` per manipolare cookies

**`src/lib/supabase/client.ts`** — Client Components
- `createClient()` via `createBrowserClient` da `@supabase/ssr`
- Solo per form registrazione (uso minimale)

### Step 2 — Schema Prisma + Migrazione
**`prisma/schema.prisma`** — Model User:
```prisma
model User {
  id         String   @id @default(cuid())
  supabaseId String   @unique
  email      String   @unique
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```
- Aggiunta: `supabaseId String @unique`
- Rimossa: `password String @db.VarChar(255)`
- Migrazione: `npx prisma migrate dev --name supabase-auth`

### Step 3 — Riscrittura `src/lib/auth.ts`
- Rimuovere: tutte le 8 funzioni attuali + import `jose`/`bcryptjs`
- Nuovo: unica funzione `getCurrentUser()` che:
  1. Crea Supabase server client
  2. Chiama `supabase.auth.getUser()` (verifica JWT lato server)
  3. Se no utente → `null`
  4. Cerca User Prisma con `where: { supabaseId }`
  5. Se non esiste → `prisma.user.upsert()` (auto-provisioning)
  6. Ritorna `{ userId: user.id, email: user.email }`

### Step 4 — Riscrittura `src/middleware.ts`
- Rimuovere: import `jose`, `JWT_SECRET`, verifica manuale
- Nuovo: usa `createClient(request)` da Step 1
- Chiama `supabase.auth.getUser()` per refresh sessione
- Path pubblici: `/login`, `/registrati`
- Se no sessione → redirect `/login`
- Ritorna `response` con cookies aggiornati

### Step 5 — Riscrittura `src/app/login/actions.ts`
- Rimuovere: import `verifyPassword`, `createToken`, `setAuthCookie`, `prisma`
- Nuovo: crea Supabase server client, chiama `signInWithPassword({ email, password })`
- Mantenere: rate limiting, audit logging, Zod validation
- Stessa firma ritorno `{ success, error? }`

### Step 6 — Riscrittura `src/app/(main)/logout/actions.ts`
- Rimuovere: import `removeAuthCookie`
- Nuovo: crea Supabase server client, chiama `signOut()`
- Mantenere: `redirect("/login")`

### Step 7 — Riscrittura password change in `src/app/(main)/impostazioni/actions.ts`
- Rimuovere: import `verifyPassword`, `hashPassword`, query Prisma per password
- Nuovo: crea Supabase server client
  - `signInWithPassword()` per verificare password attuale
  - `updateUser({ password })` per impostare la nuova
- Mantenere: Zod schema con 12+ char complexity, audit logging
- Stessa firma ritorno

### Step 8 — Pagina Registrazione (3 file nuovi)
- `src/app/registrati/page.tsx` — Server Component wrapper
- `src/app/registrati/RegistrationForm.tsx` — Client Component (email, password, confirm)
- `src/app/registrati/actions.ts` — Server Action con `signUp()`, rate limiting, audit

### Step 9 — Link registrazione da login
- `src/app/login/LoginForm.tsx` — aggiungere link "Non hai un account? Registrati" → `/registrati`

### Step 10 — Aggiornamento Audit
- `src/lib/audit.ts` — aggiungere `REGISTRATION_SUCCESS`, `REGISTRATION_FAILURE` ai tipi

### Step 11 — CSP e Config
- `next.config.ts` — aggiungere Supabase URL a `connect-src`:
  ```
  connect-src 'self' https://exeuqroxylyefbuwaroc.supabase.co
  ```

### Step 12 — Seed
- `prisma/seed.ts` — rimuovere blocco creazione user e import bcrypt, mantenere solo tax rates

### Step 13 — Cleanup .env
- `.env` e `.env.example` — rimuovere `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

## File che NON cambiano (zero modifiche)

Tutti i consumer di `getCurrentUser()` — stessa firma `{ userId, email }`:
- `fatture/actions.ts`, `acquisti/actions.ts`, `clienti/actions.ts`, `fornitori/actions.ts`
- `preventivi/actions.ts`, `note-credito/actions.ts`, `spese/actions.ts`
- `dashboard/actions.ts`, `api/pdf/*`, `api/extract/route.ts`
- `Sidebar.tsx` (chiama `logout()` via form, invariato)
- `ChangePasswordForm.tsx` (chiama `changePassword()`, stessa risposta)
- `(main)/layout.tsx`, `rate-limit.ts`

## Verifiche

- [x] `npx prisma generate` OK
- [x] `npm run typecheck` zero errori
- [x] `npm run lint` OK
- [x] Login con Supabase funziona
- [x] Registrazione + email conferma funziona
- [x] Pagine protette caricano dopo login
- [x] Server actions ritornano dati (getCurrentUser valido)
- [x] PDF generation funziona (API routes)
- [x] Cambio password funziona
- [x] Logout funziona
- [x] Audit logs scritti per tutti gli eventi auth
- [x] Session refresh automatico via middleware
- [x] Nessun riferimento a `jose`, `bcryptjs`, `auth-token` cookie nel codebase
