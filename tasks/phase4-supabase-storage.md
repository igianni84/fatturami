# Fase 4 — Supabase Storage + File Viewing

> Status: ✅ Completata (2026-03-16)
> Salvato da `.claude/plans/jolly-squishing-newell.md`

## Context

Fase 4 della migrazione multi-tenant SaaS. I file caricati (fatture acquisto e ricevute spese) sono salvati sul filesystem locale (`uploads/`) tramite `fs.writeFile`. Questo non funziona per un SaaS cloud:
- File persi al redeploy
- Non condivisibili tra repliche
- Nessun meccanismo di download/visualizzazione nel UI (bug critico: `filePath` è nel DB ma mai esposto)

**Obiettivo:** Migrare lo storage a Supabase Storage, aggiungere visualizzazione file, cleanup automatico.

## Decisioni Architetturali

| Decisione | Scelta | Motivazione |
|-----------|--------|-------------|
| Bucket | 1 privato `documents` con folder `acquisti/` e `spese/` | Semplice, tenant isolation via `{userId}/` |
| Auth storage | Service Role Key (admin client) | Server Actions hanno già `userId` da auth; no RLS su storage |
| Accesso file | Signed URL (5 min TTL) via Server Action | No proxy, sfrutta CDN Supabase |
| Schema Prisma | Nessuna migrazione | `filePath` resta `String?`, cambia solo il contenuto |
| Backward compat | Paths `uploads/*` = legacy, no download | Graceful degradation |
| Spese file view | Azione nel dropdown lista (no detail page) | Spese non hanno pagina dettaglio |

## Piano di Implementazione

### Step 1 — Env vars + Docker
**Files:** `.env`, `.env.example`, `docker-compose.yml`

- Aggiungere `SUPABASE_SERVICE_ROLE_KEY` a `.env.example` e `.env`
- Aggiungere `SUPABASE_SERVICE_ROLE_KEY` a `docker-compose.yml` service `app`
- Rimuovere volume `uploads` da `docker-compose.yml`

### Step 2 — Admin client Supabase
**Nuovo file:** `src/lib/supabase/admin.ts`

Client singleton server-side con service role key. Pattern identico a `lib/prisma.ts`. Non usa cookies (a differenza di `server.ts`).

### Step 3 — Modulo storage centralizzato
**Nuovo file:** `src/lib/supabase/storage.ts`

3 funzioni:
- `uploadFile(file, folder, userId)` → `string` (storage path)
- `getSignedUrl(filePath)` → `string | null` (backward compat per `uploads/`)
- `deleteFile(filePath)` → `void` (silent skip per `uploads/`)

Riusa `validateFileType()` da `lib/file-validation.ts`. Stessa logica di validazione (size 10MB, magic bytes).

### Step 4 — Aggiornare acquisti/actions.ts
**File:** `src/app/(main)/acquisti/actions.ts`

- Rimuovere imports `fs/promises`, `path`, `validateFileType`
- Rimuovere funzione locale `uploadFile` e costante `MAX_FILE_SIZE`
- `createPurchaseInvoice`: usare `storageUpload(file, "acquisti", user.userId)`
- `deletePurchaseInvoice`: fetch `filePath`, chiamare `storageDelete()` prima del delete DB
- Aggiungere `getPurchaseInvoiceFileUrl(id)` Server Action per signed URL

### Step 5 — Aggiornare spese/actions.ts
**File:** `src/app/(main)/spese/actions.ts`

Stesse modifiche di acquisti:
- Rimuovere local `uploadFile` e imports fs
- `createExpense`: usare `storageUpload(file, "spese", user.userId)`
- `deleteExpense`: fetch `filePath`, chiamare `storageDelete()`
- Aggiungere `getExpenseFileUrl(id)` Server Action
- Aggiungere `hasFile: boolean` a `ExpenseListItem`

### Step 6 — Componente FileAttachmentView
**Nuovo file:** `src/components/FileAttachmentView.tsx`

Client component con:
- Nome file estratto dal path
- Bottone "Apri allegato" → chiama Server Action → `window.open(signedUrl)`
- Legacy paths: messaggio "File archiviato localmente"
- Props: `getFileUrl: (id) => Promise<string|null>`, `entityId`, `filePath`

### Step 7 — UI acquisti detail page
**File:** `src/app/(main)/acquisti/[id]/page.tsx`

Aggiungere Card "Allegato" con `FileAttachmentView` quando `invoice.filePath` presente.

### Step 8 — UI spese lista
**File:** `src/app/(main)/spese/ExpenseList.tsx`

Aggiungere "Scarica allegato" nel dropdown azioni, visibile solo quando `item.hasFile === true`.

### Step 9 — CSP update
**File:** `next.config.ts`

Aggiungere dominio Supabase a `img-src` per supporto preview inline futuro.

### Step 10 — Setup manuale Supabase (documentare)
1. Dashboard Supabase → Storage → Crea bucket `documents` (privato)
2. Nessuna RLS policy necessaria (service role key bypassa RLS)

## File Coinvolti

| File | Tipo | Descrizione |
|------|------|-------------|
| `src/lib/supabase/admin.ts` | NUOVO | Admin client Supabase singleton |
| `src/lib/supabase/storage.ts` | NUOVO | uploadFile, getSignedUrl, deleteFile |
| `src/components/FileAttachmentView.tsx` | NUOVO | Client component view/download file |
| `src/app/(main)/acquisti/actions.ts` | MODIFICA | Storage Supabase + getFileUrl + cleanup delete |
| `src/app/(main)/spese/actions.ts` | MODIFICA | Storage Supabase + getFileUrl + cleanup delete + hasFile |
| `src/app/(main)/acquisti/[id]/page.tsx` | MODIFICA | Card allegato |
| `src/app/(main)/spese/ExpenseList.tsx` | MODIFICA | Download nel dropdown |
| `next.config.ts` | MODIFICA | CSP img-src |
| `.env.example` | MODIFICA | SUPABASE_SERVICE_ROLE_KEY |
| `docker-compose.yml` | MODIFICA | Rimuovere uploads volume, aggiungere env var |

## Funzioni Esistenti Riusate

- `validateFileType()` da `src/lib/file-validation.ts`
- `getCurrentUser()` / `requireUser()` da `src/lib/auth.ts`
- `createClient()` pattern da `src/lib/supabase/server.ts` (riferimento per admin.ts)
- Componenti UI: `Card`, `CardHeader`, `CardContent`, `Button`, `Badge`, `DropdownMenuItem`

## Verifica

- [x] `npm run typecheck` — zero errori
- [x] `npm run lint` — zero errori
- [x] Test manuale upload acquisto con file → verifica file nel bucket Supabase
- [x] Test manuale upload spesa con file → verifica
- [x] Test download file → signed URL si apre in nuova tab
- [x] Test delete acquisto con file → verifica file rimosso dal bucket
- [x] Test record esistenti con path legacy `uploads/` → messaggio graceful
