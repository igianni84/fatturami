# PRD: Sistema di Fatturazione Internazionale

## Introduction

Sistema web self-hosted per la gestione completa della fatturazione di un autónomo spagnolo che opera a livello internazionale. Permette di creare preventivi, fatture e note di credito verso clienti in diversi paesi (Italia, UK, UE, extra-UE), gestire fatture di acquisto e spese con riconoscimento automatico tramite AI, gestire le anagrafiche clienti/fornitori, e generare prospetti fiscali per il regime di autónomo con IVA ordinaria spagnola (21%).

## Goals

- Gestire l'intero ciclo di fatturazione attiva (preventivi, fatture, note di credito)
- Gestire fatture di acquisto e note spese con estrazione dati automatica via AI
- Supportare fatturazione internazionale con corretta gestione IVA, reverse charge e regole intra/extra-UE
- Fornire prospetti fiscali trimestrali e annuali per autónomo spagnolo
- Permettere import dello storico fatture da CSV e PDF
- Offrire un'interfaccia web semplice e veloce, deployabile via Docker

## User Stories

### US-001: Setup progetto e database schema
**Description:** Come sviluppatore, voglio impostare il progetto Next.js con Prisma e PostgreSQL con lo schema base per tutte le entità principali.

**Acceptance Criteria:**
- [ ] Progetto Next.js inizializzato con TypeScript, Tailwind CSS, Prisma
- [ ] Docker Compose con PostgreSQL e app Next.js
- [ ] Schema Prisma con tabelle: Company (dati propria azienda), Client, Supplier, Invoice, InvoiceLine, CreditNote, Quote, PurchaseInvoice, Expense, TaxRate
- [ ] Migration iniziale eseguita con successo
- [ ] Seed con dati di base (aliquote IVA per ES, IT, UK, UE, extra-UE)
- [ ] Typecheck e lint passano

### US-002: Gestione dati azienda propria
**Description:** Come utente, voglio configurare i dati della mia azienda (ragione sociale, NIF, indirizzo, IBAN, regime fiscale) in modo che appaiano nelle fatture emesse.

**Acceptance Criteria:**
- [ ] Pagina settings con form per dati azienda
- [ ] Campi: nome, NIF/CIF, indirizzo completo, paese, email, telefono, IBAN, regime fiscale
- [ ] Dati salvati in database e recuperabili
- [ ] Validazione NIF spagnolo
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-003: CRUD Anagrafica Clienti
**Description:** Come utente, voglio gestire l'anagrafica dei miei clienti con tutti i dati necessari per la fatturazione internazionale.

**Acceptance Criteria:**
- [ ] Lista clienti con ricerca e paginazione
- [ ] Form creazione/modifica cliente con campi: ragione sociale, partita IVA/VAT number, codice fiscale, indirizzo, paese, email, valuta preferita, note
- [ ] Validazione partita IVA in base al paese (formato)
- [ ] Indicazione automatica del regime IVA applicabile in base al paese del cliente (nazionale, intra-UE, extra-UE, UK)
- [ ] Eliminazione cliente (soft delete)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-004: CRUD Anagrafica Fornitori
**Description:** Come utente, voglio gestire l'anagrafica dei fornitori per associarli alle fatture di acquisto.

**Acceptance Criteria:**
- [ ] Lista fornitori con ricerca e paginazione
- [ ] Form creazione/modifica con stessi campi dei clienti + categoria spesa
- [ ] Eliminazione fornitore (soft delete)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-005: Creazione Preventivi (Quotes)
**Description:** Come utente, voglio creare preventivi da inviare ai clienti, con possibilità di convertirli in fattura.

**Acceptance Criteria:**
- [ ] Form creazione preventivo: selezione cliente, data, scadenza, righe (descrizione, quantità, prezzo unitario, IVA)
- [ ] Calcolo automatico totali (imponibile, IVA, totale)
- [ ] Numerazione progressiva preventivi (formato: PREV-YYYY-NNN)
- [ ] Stati: bozza, inviato, accettato, rifiutato, scaduto
- [ ] Azione "Converti in fattura" da preventivo accettato
- [ ] Generazione PDF del preventivo
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-006: Creazione Fatture (Invoices)
**Description:** Come utente, voglio emettere fatture con corretta gestione dell'IVA internazionale.

**Acceptance Criteria:**
- [ ] Form creazione fattura: cliente, data emissione, data scadenza, metodo pagamento, righe dettaglio
- [ ] Ogni riga: descrizione, quantità, prezzo unitario, aliquota IVA applicabile
- [ ] Logica IVA automatica in base al paese del cliente:
  - Cliente spagnolo: IVA 21% (o ridotta se applicabile)
  - Cliente UE con VAT valida: inversione contabile (reverse charge), IVA 0%
  - Cliente UE senza VAT: IVA spagnola 21%
  - Cliente UK: esente IVA (esportazione extra-UE post-Brexit)
  - Cliente extra-UE: esente IVA (esportazione)
- [ ] Diciture legali automatiche in fattura in base al regime IVA applicato
- [ ] Numerazione progressiva (formato: INV-YYYY-NNN)
- [ ] Stati: bozza, emessa, inviata, pagata, scaduta
- [ ] Supporto multi-valuta (EUR, GBP, USD) con campo tasso di cambio
- [ ] Generazione PDF fattura con layout professionale
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-007: Note di Credito
**Description:** Come utente, voglio emettere note di credito collegate a fatture esistenti.

**Acceptance Criteria:**
- [ ] Creazione nota di credito da fattura esistente (totale o parziale)
- [ ] Stessa logica IVA della fattura di riferimento
- [ ] Numerazione separata (formato: NC-YYYY-NNN)
- [ ] Collegamento alla fattura originale visibile
- [ ] Generazione PDF
- [ ] Aggiornamento stato fattura originale
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-008: Gestione Fatture di Acquisto
**Description:** Come utente, voglio registrare le fatture ricevute dai fornitori per tracciare i costi.

**Acceptance Criteria:**
- [ ] Form registrazione fattura acquisto: fornitore, numero fattura, data, righe, totale, IVA
- [ ] Upload file PDF/immagine della fattura
- [ ] Categorizzazione spesa (servizi professionali, software, hardware, viaggi, ecc.)
- [ ] Gestione IVA detraibile/non detraibile
- [ ] Stati: registrata, pagata
- [ ] Lista con filtri per fornitore, data, categoria, stato
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-009: Gestione Note Spese
**Description:** Come utente, voglio registrare spese varie (scontrini, ricevute) non associate a fatture formali.

**Acceptance Criteria:**
- [ ] Form registrazione spesa: data, descrizione, importo, categoria, IVA
- [ ] Upload foto/PDF dello scontrino
- [ ] Categorie predefinite: trasporti, pasti, materiale ufficio, telecomunicazioni, altro
- [ ] Flag deducibile/non deducibile
- [ ] Lista con filtri e totali per periodo
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-010: OCR/AI Estrazione Dati da Fatture e Spese
**Description:** Come utente, quando carico un PDF o un'immagine di una fattura/spesa, voglio che il sistema estragga automaticamente i dati principali.

**Acceptance Criteria:**
- [ ] Al caricamento di un file, invio a Claude API (vision) per analisi
- [ ] Estrazione automatica: fornitore (nome, P.IVA), data, numero fattura, righe, importi, IVA, totale
- [ ] Matching automatico fornitore con anagrafica esistente (o proposta creazione nuovo)
- [ ] Pre-compilazione del form con i dati estratti
- [ ] Possibilità di correggere manualmente i dati estratti prima di salvare
- [ ] Supporto PDF multipagina e immagini (JPG, PNG)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-011: Import Storico da CSV
**Description:** Come utente, voglio importare lo storico delle fatture emesse e ricevute da file CSV.

**Acceptance Criteria:**
- [ ] Pagina import con upload CSV
- [ ] Mapping colonne CSV ai campi del sistema (interfaccia drag&drop o selezione)
- [ ] Preview dei dati prima dell'import
- [ ] Validazione dati (formati date, importi, campi obbligatori)
- [ ] Creazione automatica clienti/fornitori se non esistenti
- [ ] Report import con successi/errori
- [ ] Supporto import fatture emesse e fatture ricevute separatamente
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-012: Import Storico da PDF (batch)
**Description:** Come utente, voglio caricare in blocco PDF di fatture storiche e farle analizzare dall'AI.

**Acceptance Criteria:**
- [ ] Upload multiplo di file PDF/immagini
- [ ] Elaborazione in coda (batch) con progresso visibile
- [ ] Uso dell'AI (US-010) per estrarre dati da ciascun file
- [ ] Review dei dati estratti prima di confermare l'import
- [ ] Associazione automatica a clienti/fornitori esistenti
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-013: Dashboard Riepilogativa
**Description:** Come utente, voglio vedere una dashboard con i principali indicatori finanziari.

**Acceptance Criteria:**
- [ ] Fatturato del periodo (mese/trimestre/anno) selezionabile
- [ ] Totale spese/acquisti del periodo
- [ ] Saldo (fatturato - costi)
- [ ] Fatture in scadenza / scadute
- [ ] Grafico andamento fatturato mensile
- [ ] Ultimi documenti emessi/ricevuti
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-014: Prospetto IVA Trimestrale (Modelo 303)
**Description:** Come autónomo spagnolo, voglio un prospetto che mi calcoli l'IVA da versare trimestralmente.

**Acceptance Criteria:**
- [ ] Calcolo IVA repercutida (IVA sulle fatture emesse a clienti spagnoli)
- [ ] Calcolo IVA soportada deducible (IVA sulle fatture di acquisto detraibili)
- [ ] Risultato: IVA da versare = repercutida - soportada
- [ ] Esclusione corretta delle fatture intra-UE e extra-UE dal calcolo IVA domestica
- [ ] Visualizzazione per trimestre (Q1: gen-mar, Q2: apr-giu, Q3: lug-set, Q4: ott-dic)
- [ ] Dettaglio delle operazioni intracomunitarie (da dichiarare nel modelo 349)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-015: Prospetto IRPF / Reddito
**Description:** Come autónomo spagnolo, voglio un prospetto che mi stimi le tasse sul reddito (IRPF) e le ritenute.

**Acceptance Criteria:**
- [ ] Calcolo reddito netto: fatturato - spese deducibili
- [ ] Stima IRPF con scaglioni spagnoli aggiornati
- [ ] Calcolo pagos fraccionados trimestrali (modelo 130): 20% del reddito netto trimestrale
- [ ] Riepilogo annuale con stima tassazione totale
- [ ] Indicazione delle ritenute IRPF applicate dai clienti spagnoli (se applicabile)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-016: Generazione PDF Professionali
**Description:** Come utente, voglio che fatture, preventivi e note di credito vengano generati come PDF con layout professionale.

**Acceptance Criteria:**
- [ ] Template PDF con: logo, dati azienda, dati cliente, righe dettaglio, totali, note, coordinate bancarie
- [ ] Diciture legali in base al tipo di operazione IVA
- [ ] Supporto multi-lingua (spagnolo, italiano, inglese) selezionabile per documento
- [ ] Download diretto e anteprima in-browser
- [ ] Typecheck passa

### US-017: Autenticazione e Sicurezza
**Description:** Come utente, voglio che il sistema sia protetto da login sicuro essendo self-hosted.

**Acceptance Criteria:**
- [ ] Login con email/password
- [ ] Hashing password con bcrypt
- [ ] Sessioni con JWT o cookie httpOnly
- [ ] Middleware di protezione su tutte le route (tranne login)
- [ ] Possibilità di cambiare password
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Il sistema deve supportare la creazione di preventivi con numerazione progressiva e conversione in fattura
- FR-2: Il sistema deve emettere fatture con calcolo IVA automatico basato sul paese del cliente e sul tipo di operazione (nazionale, intra-UE reverse charge, extra-UE esente)
- FR-3: Il sistema deve supportare multi-valuta (EUR, GBP, USD) con tasso di cambio manuale per fattura
- FR-4: Il sistema deve generare note di credito totali o parziali collegate a fatture esistenti
- FR-5: Il sistema deve permettere il caricamento di fatture di acquisto e spese con estrazione dati automatica tramite Claude Vision API
- FR-6: Il sistema deve gestire anagrafiche clienti e fornitori con dati fiscali internazionali (P.IVA, VAT number, NIF)
- FR-7: Il sistema deve calcolare il prospetto IVA trimestrale secondo il modelo 303 spagnolo
- FR-8: Il sistema deve stimare l'IRPF e i pagos fraccionados trimestrali (modelo 130)
- FR-9: Il sistema deve generare PDF professionali multilingua per tutti i documenti
- FR-10: Il sistema deve supportare import storico da CSV con mapping colonne e da PDF con analisi AI batch
- FR-11: Il sistema deve applicare automaticamente le diciture legali corrette in fattura (reverse charge, esportazione, ecc.)
- FR-12: Il sistema deve essere deployabile tramite Docker Compose (app + database)
- FR-13: Il sistema deve essere protetto da autenticazione con login

## Non-Goals

- Non è un sistema multi-utente/multi-azienda (singolo utente/azienda)
- Non gestisce fatturazione elettronica SDI italiana (solo PDF)
- Non si integra con l'Agencia Tributaria per invio telematico
- Non gestisce pagamenti online o incassi automatici
- Non include un sistema di notifiche email automatiche
- Non gestisce inventario o magazzino
- Non gestisce stipendi o buste paga
- Non si integra con sistemi bancari per riconciliazione automatica

## Design Considerations

- UI minimale e funzionale, stile dashboard moderna con Tailwind CSS
- Navigazione sidebar: Dashboard, Fatture, Preventivi, Note Credito, Acquisti, Spese, Anagrafiche, Fiscale, Impostazioni
- Responsive ma ottimizzato per desktop (uso primario)
- Componenti riutilizzabili: DataTable, Form fields, Modal, PDF viewer
- Lingua interfaccia: italiano (principale), con documenti generabili in ES/IT/EN

## Technical Considerations

- **Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL
- **PDF:** Libreria come `@react-pdf/renderer` o `puppeteer` per generazione PDF
- **AI/OCR:** Anthropic Claude API con vision per estrazione dati da immagini/PDF
- **Auth:** NextAuth.js o soluzione custom con JWT
- **Deploy:** Docker Compose con container per Next.js app e PostgreSQL
- **File storage:** Filesystem locale (volume Docker) per PDF e immagini caricate
- **Validazione:** Zod per validazione form e API

## Success Metrics

- Creazione di una fattura in meno di 2 minuti
- Estrazione dati AI corretta al 90%+ (senza correzioni manuali)
- Prospetto IVA trimestrale generato in 1 click
- Import storico completato senza perdita di dati

## Additional Questions & Answers

- Serve supporto per ritenute d'acconto (retenciones) nelle fatture verso clienti spagnoli? Si
- I clienti italiani richiedono fattura elettronica XML o basta PDF? Basta PDF
- Serve integrazione con VIES per validazione partite IVA intracomunitarie in tempo reale? Si
- Quale formato preferito per il numero fattura (personalizzabile o fisso)? Come hai suggerito tu nel documento
- Serve gestione di più conti bancari/IBAN per i pagamenti? No
