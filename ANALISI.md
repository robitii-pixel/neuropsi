# Relazione iniziale — analisi del repository (fase 1)

Data: 12/07/2026 — riferita allo stato del repo PRIMA dell'iterazione "v3".

## Stato attuale

- Prototipo funzionante in un solo file `index.html` (~35 KB): vanilla JS, nessuna
  dipendenza, dati in `localStorage`, PWA (manifest + service worker rete-prima),
  pubblicazione su GitHub Pages via workflow.
- Percorso in 5 passi: sessione pseudonimizzata → giudizio per 8 domini → classificazione
  descrittiva → proposte di secondo livello → bozza di referto con stampa.
- Qualità: suite QA (31→34 test) sulla logica pura estratta dall'HTML; smoke test
  Playwright su 3 viewport; import/export JSON validati; salvataggio con flush su
  chiusura pagina (bug di perdita dati trovato e corretto in v1).

## Criticità (rispetto al nuovo obiettivo)

1. Il "primo livello" registrava un giudizio per dominio, non per singola prova:
   mancavano punteggi grezzi/corretti per test, tempi, errori, autocorrezioni,
   intrusioni, perseverazioni, stati "non eseguita"/"non interpretabile".
2. Nessun catalogo test: impossibile comporre una batteria.
3. Nessun motore di scoring, nemmeno come struttura.
4. Anamnesi, quesito clinico e condizioni di validità assenti dal modello dati.
5. Referto povero (niente tabella risultati, niente sezioni su validità/limiti/follow-up,
   nessun versionamento).
6. Nessun confronto longitudinale.

## Rischi

- Contenutistici: introdurre per errore materiali di test protetti, norme, cut-off o
  formule non verificate → mitigato con catalogo di soli metadati, licenza "da
  verificare" ovunque, motore vuoto per progetto, test QA che verificano l'assenza di
  cut-off numerici e di termini diagnostici nei testi generati.
- Tecnici: crescita del file unico (~35→~75 KB, soglia dichiarata dal proprietario
  ~400 KB: ampio margine); localStorage senza cifratura (accettato per la demo,
  documentato); nessun backend = nessun rischio di trasmissione dati.
- Clinici: la classificazione resta un giudizio del clinico rispetto alle norme dello
  strumento originale; l'app non deve mai sostituirlo (vincolo mantenuto ovunque).

## Proposta architetturale

Mantenere il file unico (requisito di portabilità del proprietario) con confini interni
netti:
- blocco `NS-LOGIC` di logica pura (modello dati, catalogo, validazioni, scoring,
  profilo, regole adattive, referto, migrazioni) testato da `qa.js` senza browser;
- livello DOM separato (viste, azioni, binding, cronometro);
- norme SOLO come "pacchetti normativi" JSON importati a runtime con fonte
  obbligatoria e validazione dello schema: si aggiungono senza toccare il codice;
- persistenza `localStorage` con sanificazione al load e migrazione tra schemi
  (v1→v2 implementata);
- predisposizione futura (fase sicurezza): autenticazione/ruoli/audit/cifratura
  richiederanno un backend; l'attuale separazione logica/DOM/dati e l'export
  strutturato sono pensati per rendere il porting indolore.

## Ordine consigliato degli interventi

1. modello dati clinico (schema 2) + migrazione — FATTO in v3
2. catalogo test + selezione batteria — FATTO in v3
3. registrazione punteggi/tempi/errori/stati — FATTO in v3
4. struttura del motore di scoring + pacchetti normativi — FATTO in v3
5. profilo per domini con qualità del dato e override — FATTO in v3
6. secondo livello adattivo con regole trasparenti — FATTO in v3
7. referto strutturato con versionamento — FATTO in v3 (PDF via stampa browser)
8. confronto longitudinale — FATTO in v4 (codice paziente, valutazione di controllo,
   passo 7 di confronto descrittivo, sezione 10 del referto; demo con coppia collegata)
9. modalità demo estesa, esport referto strutturato, rifiniture UI tablet — successive
10. hardening privacy/sicurezza oltre la demo — quando si uscirà dal perimetro locale
