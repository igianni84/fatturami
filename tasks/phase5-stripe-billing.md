# Fase 5: Stripe Billing + Limite Fatture

## Status: ✅ Completata (2026-03-16)

## Context

fatturami.cloud è un SaaS di fatturazione multi-tenant (Fasi 0-4 completate). La Fase 5 aggiunge la monetizzazione: piano free con limite 10 fatture emesse, piano Pro a EUR10/mese o EUR100/anno via Stripe Checkout.

**Regole business:**
- Free: 10 fatture EMESSE (status "emessa" in poi). Draft illimitate.
- Dopo 10: può consultare, modificare bozze, ma NON emettere
- Pro: EUR10/mese o EUR100/anno. Cancellazione torna a free (dati conservati).

---

## Decisioni di Design

| Decisione | Scelta | Motivazione |
|-----------|--------|-------------|
| Conteggio fatture | Query on-demand via `COUNT` | Affidabile, niente drift. Indice `@@index([userId, status])` già presente |
| Stripe client-side | NO `@stripe/stripe-js` | Usiamo Stripe Checkout (redirect), zero bundle client-side |
| `stripeCustomerId` | Su Subscription, non User | Separazione pulita, User resta lean |
| Utente senza Subscription row | Implicitamente free | Niente backfill, niente colonne nullable su User |
| `past_due` | Permette emissione | Stripe ritenta il pagamento, bloccare subito è UX ostile |
| Gestione subscription | Stripe Customer Portal | Zero UI custom per upgrade/downgrade/cancellazione |
| Webhook route | `src/app/api/stripe/webhook/` (fuori da `(main)`) | Bypass auth + layout check |

---

## File Implementati

| File | Azione | Scopo |
|------|--------|-------|
| `package.json` | Modifica | +stripe 20.x |
| `.env.example` + `.env` | Modifica | +5 Stripe env vars |
| `prisma/schema.prisma` | Modifica | +SubscriptionStatus enum, +Subscription model, +User.subscription |
| `src/lib/stripe.ts` | **Nuovo** | Stripe client singleton |
| `src/lib/billing.ts` | **Nuovo** | getBillingInfo(), canUserEmitInvoice() |
| `src/middleware.ts` | Modifica | +"/api/stripe" in PUBLIC_PATHS |
| `src/app/(main)/fatture/actions.ts` | Modifica | Billing gate su updateInvoiceStatus |
| `src/app/(main)/fatture/InvoiceList.tsx` | Modifica | Handle errore billing con toast+CTA |
| `src/app/api/stripe/webhook/route.ts` | **Nuovo** | Webhook handler (5 eventi) |
| `src/app/(main)/abbonamento/page.tsx` | **Nuovo** | Billing dashboard page |
| `src/app/(main)/abbonamento/actions.ts` | **Nuovo** | Server actions (checkout, portal) |
| `src/app/(main)/abbonamento/BillingDashboard.tsx` | **Nuovo** | Client component UI |
| `src/components/Sidebar.tsx` | Modifica | +link "Abbonamento" |

---

## Webhook Events

| Evento Stripe | Azione |
|---------------|--------|
| `checkout.session.completed` | Attiva subscription (status: active) |
| `invoice.paid` | Rinnovo ok (status: active, aggiorna currentPeriodEnd) |
| `invoice.payment_failed` | Pagamento fallito (status: past_due) |
| `customer.subscription.deleted` | Cancellazione (status: canceled, reset stripeSubscriptionId) |
| `customer.subscription.updated` | Sync status generico |

---

## Note Tecniche

- Stripe v20 API: `current_period_end` è su `SubscriptionItem`, non `Subscription`
- Stripe v20 API: `Invoice.subscription` è ora `Invoice.parent.subscription_details.subscription`
- Test webhook locale: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Carta test: `4242 4242 4242 4242`

---

## Verifica End-to-End

1. `npm run typecheck` — ✅ passa
2. `npm run lint` — ✅ passa
3. `npx prisma migrate dev` — ✅ crea tabella Subscription
4. **Free tier**: Creare 10 fatture, emetterle tutte. L'11esima emissione mostra toast errore con CTA "Passa a Pro"
5. **Checkout**: Click "Passa a Pro" → redirect Stripe → carta test → redirect `/abbonamento?success=true`
6. **Webhook**: `checkout.session.completed` → Subscription.status = "active"
7. **Pro**: 11esima fattura emessa con successo
8. **Portal**: "Gestisci abbonamento" → Stripe Portal → cancella
9. **Cancellation**: `customer.subscription.deleted` → status = "canceled"
10. **Free again**: 12esima fattura bloccata
11. **Dati conservati**: tutte le fatture restano visibili
