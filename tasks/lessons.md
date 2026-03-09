# Lessons Learned

## Audit Pattern

1. **Verifica sempre gli enum Prisma prima di segnalare mismatch** - L'ARCH-01 era un falso positivo perche `convertito` era gia presente nell'enum `QuoteStatus` dello schema Prisma. La funzione `updateQuoteStatus` non lo include intenzionalmente (non si deve poter impostare manualmente).

2. **Auth check defense-in-depth** - Anche se il middleware JWT protegge le route, aggiungere `getCurrentUser()` nelle Server Actions e API routes fornisce un secondo livello di protezione. Pattern:
   ```typescript
   const user = await getCurrentUser();
   if (!user) {
     return { success: false, message: "Non autenticato" };
   }
   ```

3. **Timing attack su login** - Quando l'utente non esiste, bisogna comunque chiamare bcrypt.compare con un hash placeholder per mantenere tempi di risposta costanti ed evitare user enumeration.

4. **Promise.all per query indipendenti** - Le query Prisma indipendenti devono SEMPRE essere parallelizzate con Promise.all. Il dashboard aveva 7 query sequenziali (~700ms) ridotte a ~150ms.

5. **State transitions server-side** - Le transizioni di stato definite solo client-side possono essere bypassate. Validare sempre anche server-side con un oggetto `statusTransitions` che mappa stato corrente -> stati consentiti.

6. **XML escaping obbligatorio** - Qualsiasi valore inserito in template XML/SOAP deve essere escapato con una funzione `escapeXml()` per prevenire injection (`&`, `<`, `>`, `"`, `'`).

7. **JWT_SECRET in production** - Mai usare fallback default per secret crittografici. Aggiungere un throw all'avvio se la variabile non e configurata in production.

8. **File upload size limits** - Sempre validare `file.size` con un MAX_FILE_SIZE prima di processare il file per prevenire DoS.

9. **Audit logging non deve mai rompere il flusso** - La funzione `logAuditEvent()` wrappa sempre in try/catch con `console.error` come fallback. Un errore di logging non deve causare un 500 all'utente.

10. **Prisma Json type richiede `Prisma.InputJsonValue`** - Il tipo `Record<string, unknown>` non e assegnabile al campo `Json?` di Prisma. Usare `Prisma.InputJsonValue` dal client generato.

11. **Soft-delete check su document creation** - Quando si crea un documento (fattura, preventivo, acquisto) che referenzia un'anagrafica (client/supplier), SEMPRE aggiungere `deletedAt: null` nel where della findUnique. Il dropdown puo filtrare i soft-deleted, ma una race condition o chiamata diretta puo ancora passare un ID eliminato.

12. **Middleware Edge Runtime** - Il middleware Next.js gira su Edge Runtime, quindi NON puo usare Prisma (richiede Node.js). Per il logging JWT usare solo `console.error`. La libreria `jose` funziona in Edge perche e progettata per questo.

13. **jose error types** - Per discriminare gli errori JWT, importare `errors` da jose e usare `instanceof`: `JWTExpired` (token scaduto, flusso normale), `JWTInvalid` (token malformato), `JWSSignatureVerificationFailed` (possibile token forgiato con secret diverso), `JWTClaimValidationFailed` (claim non validi).

14. **Rate limiting in-memory** - Per deployment single-instance (Docker Compose), un `Map<string, timestamps[]>` con sliding window e sufficiente. Ricordarsi di: cleanup periodico con `setInterval` + `.unref()`, singleton per persistere tra request, key basata su userId (non IP).

15. **useEffect over-specification trap** - Props costanti passate dal server (es. `initialYear`) non vanno incluse nel dependency array di useEffect. Non cambiano mai, aggiungono rumore e confondono l'intento. Usare `eslint-disable-next-line react-hooks/exhaustive-deps` con commento esplicativo.

16. **useEffect async cleanup pattern** - Quando useEffect chiama un'azione async (server action, fetch), usare sempre un flag `cancelled` nel cleanup per evitare state update dopo unmount o re-run. Aggiungere `.catch()` e `.finally()` per evitare loading state bloccato su errore.

17. **URL search params > useState per UI state** - Filtri/periodo/pagina devono essere in URL search params, non in useState + useEffect. Pattern: server page legge `searchParams`, fetcha dati, passa al client component. Il client usa `useRouter().push()` + `useTransition` per navigare. Benefici: URL bookmarkable, zero waterfall, `isPending` nativo da React 19.

18. **Validare falsi positivi prima di fixare** - Durante audit, verificare sempre se un item e realmente un bug. Esempi: PDF batch sequenziale era intenzionale (rate limit), search debouncing non necessario (trigger su Enter/blur), stili errore gia consistenti. Risparmia tempo e riduce rischio di regressioni.
