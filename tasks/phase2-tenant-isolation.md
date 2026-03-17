# Phase 2 — Tenant Isolation (userId su tutti i modelli)

> Status: ✅ Completata (2026-03-16)
> Salvato da `.claude/plans/eventual-wondering-penguin.md`

## Context

La Fase 0 (MySQL→PostgreSQL) e la Fase 1 (Supabase Auth) sono complete. Questa fase aggiunge `userId` a tutti i modelli tenant per isolare i dati per utente — prerequisito fondamentale per il SaaS multi-utente.

**Problema:** Attualmente tutti i dati (fatture, clienti, fornitori, etc.) sono globali. Qualsiasi utente autenticato vede tutto. Molte funzioni di lettura (getClients, getInvoices, getDashboardData, report IVA/IRPF) non hanno nemmeno il check di autenticazione — si affidano solo al middleware.

**Obiettivo:** Ogni query su dati tenant deve essere filtrata per `userId`. Ogni creazione deve associare il record all'utente. Le cancellazioni/modifiche devono verificare la proprietà.

## Strategia: Manual userId injection

Scartato l'approccio Prisma Extension perché:
- Il singleton `prisma` non conosce il userId (è request-scoped)
- Le `$transaction` array-style non propagano l'extension
- TypeScript strict mode è già un safety net sufficiente per i `create()`

## Step-by-step

### Step 1 — Schema Prisma + Migration
**File: `prisma/schema.prisma`**

Aggiungere `userId String` + `user User @relation(...)` + indici a:
- **Company** → `userId @unique` (una per utente)
- **Client** → `userId` + `@@index([userId, deletedAt, name])`
- **Supplier** → `userId` + `@@index([userId, deletedAt, name])`
- **Invoice** → `userId` + `@@index([userId, status])` + `@@unique([userId, number])` (rimuove `@unique` globale)
- **Quote** → `userId` + `@@index([userId, status])` + `@@unique([userId, number])`
- **CreditNote** → `userId` + `@@index([userId, invoiceId])` + `@@unique([userId, number])`
- **PurchaseInvoice** → `userId` + `@@index([userId, status])`
- **Expense** → `userId` + `@@index([userId])`

User model: aggiungere relazioni inverse (companies, clients, suppliers, invoices, quotes, creditNotes, purchaseInvoices, expenses).

**File: `prisma/migrations/20260316_tenant_isolation/migration.sql`**
- ADD COLUMN nullable → UPDATE backfill → ALTER SET NOT NULL → ADD FK → DROP old unique → CREATE new compound unique + indexes

### Step 2 — Helper `requireUser()` in `src/lib/auth.ts`
```typescript
export async function requireUser(): Promise<{ userId: string; email: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non autenticato");
  return user;
}
```
Usato nelle funzioni read-only che attualmente non hanno auth check.

### Step 3 — Server Actions (per batch, ordine di dipendenza)

| Batch | File | Prisma calls | Note |
|-------|------|-------------|------|
| 3a | `impostazioni/actions.ts` | 5 | Company: `findFirst()` → `findUnique({ where: { userId } })`, saveCompany → `upsert` |
| 3b | `clienti/actions.ts` | 8 | Aggiungere auth a getClients/getClient, userId a tutti WHERE/create |
| 3c | `fornitori/actions.ts` | 7 | Stesso pattern di clienti |
| 3d | `fatture/actions.ts` | ~25 | **Più complesso**: document number, FK validation (clientId + userId), payment ownership |
| 3e | `preventivi/actions.ts` | ~10 | + `preventivi/[id]/page.tsx` (Server Component con Prisma diretto) |
| 3f | `note-credito/actions.ts` | ~10 | + `note-credito/[id]/page.tsx`, verificare invoice ownership |
| 3g | `acquisti/actions.ts` | ~10 | Verificare supplierId ownership |
| 3h | `spese/actions.ts` | ~6 | Semplice |

### Step 4 — Dashboard e Report
| File | Calls | Note |
|------|-------|------|
| `dashboard/actions.ts` | ~7 | Zero auth attualmente, aggiungere requireUser() + userId |
| `fiscale/iva/actions.ts` | ~3 | Zero auth |
| `fiscale/irpf/actions.ts` | ~12 | Zero auth, loop per trimestre |

### Step 5 — API Routes
| File | Calls |
|------|-------|
| `api/pdf/invoice/route.ts` | 2 (invoice + company lookup) |
| `api/pdf/quote/route.ts` | 2 |
| `api/pdf/credit-note/route.ts` | 2 |
| `api/extract/route.ts` | 1 (supplier match) |

### Step 6 — Import
| File | Calls | Note |
|------|-------|------|
| `import/csv/actions.ts` | ~20 | findOrCreateClient/Supplier → aggiungere `userId` param |
| `import/pdf/actions.ts` | ~10 | Stessa cosa |

### Step 7 — Modelli NON modificati
- **TaxRate** — dati globali di sistema, condivisi tra utenti
- **AuditLog** — ha già `userId?` opzionale
- **Payment/InvoiceLine/QuoteLine/etc.** — child entities, isolamento via parent FK
- **prisma/seed.ts** — seeda solo TaxRate

## Pattern di modifica per ogni query

| Operazione | Prima | Dopo |
|-----------|-------|------|
| `findMany` | `where: { status, ... }` | `where: { userId, status, ... }` |
| `findFirst`/`findUnique` | `where: { id }` | `where: { id, userId }` |
| `create` | `data: { ... }` | `data: { userId, ... }` |
| `update` | `where: { id }` | `where: { id, userId }` (ownership check) |
| `delete` | `where: { id }` | `where: { id, userId }` |
| `count` | `where: { ... }` | `where: { userId, ... }` |
| `aggregate` | `where: { ... }` | `where: { userId, ... }` |
| FK validation | `findUnique({ where: { id: clientId } })` | `findUnique({ where: { id: clientId, userId } })` |
| Company | `findFirst()` | `findUnique({ where: { userId } })` |

## Verifica

- [x] `npx prisma generate` — successo
- [x] `npm run typecheck` — 0 errori (TS cattura ogni `create` senza userId)
- [x] `npx eslint src/` — 0 errori
- [x] **Grep audit**: `grep -rn "prisma\.\(company\|client\|supplier\|invoice\|quote\|creditNote\|purchaseInvoice\|expense\)\." src/ | grep -v userId` → ogni risultato giustificato
- [x] Test manuale con 2 utenti Supabase

## File critici (22 totali)

**Schema:** `prisma/schema.prisma`
**Auth:** `src/lib/auth.ts`
**Actions (8):** impostazioni, clienti, fornitori, fatture, preventivi, note-credito, acquisti, spese
**Pages (2):** `preventivi/[id]/page.tsx`, `note-credito/[id]/page.tsx`
**Dashboard/Reports (3):** dashboard, iva, irpf
**API Routes (4):** pdf/invoice, pdf/quote, pdf/credit-note, extract
**Import (2):** csv, pdf
**Migration (1):** `prisma/migrations/20260316_tenant_isolation/migration.sql`
