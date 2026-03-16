# Trasformazione Multi-Tenant SaaS — Tracking

## Stato Fasi

| Fase | Descrizione | Stato | Conversazione |
|------|-------------|-------|---------------|
| 0 | Migrazione DB MySQL → PostgreSQL | ✅ Completata | 2026-03-16 |
| 1 | Supabase Auth (sostituisce JWT custom) | ✅ Completata | 2026-03-16 |
| 2 | Isolamento tenant (userId su tutti i modelli) | ✅ Completata | 2026-03-16 |
| 3 | Onboarding + sistema fiscale IT/ES | ✅ Completata | 2026-03-16 |
| 4 | Supabase Storage + File Viewing | ✅ Completata | 2026-03-16 |
| 5 | Stripe billing + limiti fatture | ✅ Completata | 2026-03-16 |
| 6 | SDI fatturazione elettronica IT | ⬜ Da fare | — |
| 7 | Landing page + documentazione | ⬜ Da fare | — |

## Dependency Graph

```
Fase 0 ✅ → Fase 1 ✅ → Fase 2 ✅ → Fase 3 ✅ → Fase 6
                              → Fase 4 ✅
                              → Fase 5 ✅
                              → Fase 7
```

## Fase 0 — Dettaglio Completamento

### Modifiche effettuate
- `prisma/schema.prisma`: provider `mysql` → `postgresql`, aggiunto `directUrl`
- `.env` e `.env.example`: connection string PostgreSQL
- `docker-compose.yml`: MySQL 8.0 → PostgreSQL 16-alpine
- `prisma/migrations/0_init/migration.sql`: baseline PostgreSQL completa (tutti i modelli + enum + indici + FK)
- `prisma/migrations/migration_lock.toml`: provider `postgresql`
- Rimosse vecchie migrazioni MySQL (0_init, 1_add_partial_payments, duplicati stale)

### Verifiche
- [x] `npx prisma generate` — successo
- [x] `npm run typecheck` — passa senza errori
- [x] Annotazioni `@db.VarChar()` e `@db.Text` — compatibili con PostgreSQL, nessuna modifica necessaria

### Note per Fase 1
- Il DB locale richiede `docker compose up db` con la nuova config PostgreSQL
- `directUrl` è pronto per Supabase (bypassa connection pooler per migrazioni)
- Il seed (`prisma/seed.ts`) funzionerà senza modifiche su PostgreSQL
