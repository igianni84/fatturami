# Fase 6: SDI (Fatturazione Elettronica Italiana)

> Copiato da `.claude/plans/clever-napping-dewdrop.md` (piano master SaaS migration)

## Motivazione

Feature avanzata per il mercato italiano. La fatturazione elettronica via SDI è obbligatoria per tutte le partite IVA italiane. Richiede Fasi 0-3 completate (in particolare Fase 3 per il sistema fiscale IT).

## Stack SDI

- `@palmabit/json2fatturapaxml` — generazione XML FatturaPA
- `@invoicetronic/ts-sdk` — intermediario SDI accreditato (REST API, sandbox gratuita)

## Schema Changes (Prisma)

**Invoice:**
- `+sdiStatus` — enum: pending, sent, accepted, rejected, error
- `+sdiId` — String? (ID ricevuto dall'intermediario)
- `+sdiXmlPath` — String? (path XML su Supabase Storage)

**Client (IT):**
- `+codiceDestinatario` — String? (7 caratteri, codice univoco SDI)
- `+pec` — String? (PEC per destinatari senza codice SDI)

## Checklist Implementazione

- [ ] Installare pacchetti SDI (`@palmabit/json2fatturapaxml`, `@invoicetronic/ts-sdk`)
- [ ] Creare `src/lib/sdi/xml-generator.ts` (Invoice → FatturaPA XML)
- [ ] Creare `src/lib/sdi/invoicetronic-client.ts` (submit via API)
- [ ] Aggiungere campi SDI a Invoice e Client in Prisma
- [ ] UI per invio SDI nella pagina dettaglio fattura (solo utenti IT)
- [ ] Tracking status SDI (pending → sent → accepted/rejected)
- [ ] Webhook per notifiche SDI
- [ ] Verificare: genera XML valido, invio a sandbox Invoicetronic, ricezione notifica

## File Nuovi

- `src/lib/sdi/xml-generator.ts`
- `src/lib/sdi/invoicetronic-client.ts`

## File da Modificare

- `prisma/schema.prisma` (campi SDI su Invoice e Client)
- `src/app/(main)/fatture/[id]/page.tsx` (UI invio SDI)

## Verifica End-to-End

- Generare XML FatturaPA per una fattura IT
- Validare XML contro XSD
- Invio a sandbox Invoicetronic ritorna sdiId

## Note

- Solo utenti IT (country = "IT") vedono la funzionalità SDI
- Il codiceDestinatario "0000000" indica PEC come canale di recapito
- Forfettari emettono fatture elettroniche con aliquota IVA 0% e natura "N2.2"
