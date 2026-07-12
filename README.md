# NeuroScreen Clinico — prototipo

Prototipo **locale** di applicazione web per la valutazione neuropsicologica guidata.
Un solo file (`index.html`), nessun backend, nessuna dipendenza, nessun dato che lascia
il dispositivo: si apre con un doppio clic in qualunque browser moderno, anche offline.

## Percorso clinico (5 passi)

1. **Sessione** — dati essenziali e non identificativi: codice pseudonimo (obbligatorio),
   data, esaminatore, età, scolarità, lateralità, motivo della valutazione, anamnesi breve.
2. **Primo livello** — screening per 8 domini cognitivi. Per ogni dominio il clinico
   registra un giudizio sintetico (nella norma / borderline / deficit), lo strumento
   utilizzato, il punteggio grezzo e note qualitative.
3. **Classificazione preliminare** — sintesi descrittiva e **non diagnostica** del primo
   livello, con avvertenze automatiche (valutazione parziale, orientamento deficitario).
   Il clinico la conferma esplicitamente, con una propria nota facoltativa.
4. **Secondo livello** — l'app propone moduli di approfondimento in base ai domini
   deboli (priorità alta/media, con la motivazione di ogni proposta). Il clinico può
   escludere le proposte e aggiungere altri moduli dal catalogo; per ogni modulo incluso
   registra esito, strumento e note. Se il primo livello cambia dopo la conferma,
   l'app lo segnala e chiede di riconfermare.
5. **Referto** — bozza generata dai dati inseriti, modificabile a mano, con copia negli
   appunti e stampa/PDF (si stampa solo il referto). La bozza dichiara sempre di non
   costituire diagnosi.

## Gestione delle sessioni

- Più sessioni **pseudonimizzate** (solo codici, mai dati identificativi: l'abbinamento
  codice–persona va tenuto fuori dall'applicazione).
- Salvataggio automatico in `localStorage` (chiave `neuroscreen_v1`), anche alla chiusura
  della pagina.
- **Esportazione/importazione JSON** (singola sessione o backup completo) con validazione
  del formato, scarto delle voci corrotte e rinomina automatica dei codici duplicati.

## Che cosa NON contiene (per scelta)

- **Nessun test neuropsicologico protetto**: i giudizi per dominio sono del clinico,
  formulati con gli strumenti che ha scelto e somministrato.
- **Nessuna tabella normativa**: `TEST_REGISTRY` in `index.html` è la struttura già
  predisposta (schema documentato nel codice) per integrare in futuro test validati e
  norme da fonti lecite; oggi è vuota e `applyNorms()` risponde "non disponibile".
- **Nessuna diagnosi automatica**: classificazione e referto sono descrittivi; la suite
  QA verifica che non compaiano termini diagnostici nei testi generati.

## Controlli

- `npm run check` — suite QA (31 test, senza dipendenze): logica di classificazione,
  selezione adattiva dei moduli, fusione delle decisioni del clinico, referto,
  validazioni, import/export, vincoli sull'HTML (nessuna risorsa esterna, disclaimer).
- `node smoke.js` — test end-to-end opzionale nel browser (richiede `playwright-core`
  e Chromium): percorso completo su desktop, tablet e smartphone, persistenza dopo
  ricarica, assenza di scroll orizzontale, tocchi ≥44 px, zero errori in console.

## Limiti noti del prototipo

- I dati vivono solo nel browser del dispositivo: esportare regolarmente il backup JSON.
- Un solo "clinico" per dispositivo/browser; nessuna sincronizzazione (voluta: zero rete).
- La selezione dei moduli è basata su regole semplici e trasparenti (punteggio per
  dominio debole); non è un algoritmo validato ed è pensata per essere sempre
  supervisionata dal clinico.
