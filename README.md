# NeuroScreen Clinico

Piattaforma **locale** per la valutazione neuropsicologica guidata: somministrazione
assistita, registrazione dei risultati, profilo per domini, selezione adattiva degli
approfondimenti e bozza di referto. Un solo file (`index.html`), nessun backend, nessuna
dipendenza: si apre con un doppio clic in qualunque browser moderno, anche offline.

**Versione dimostrativa, non autorizzata per uso clinico reale.**

## Percorso clinico (8 passi)

1. **Sessione e quesito** — codice pseudonimo obbligatorio; età, sesso, scolarità,
   lingua madre, professione, lateralità; quesito clinico, sospetto dell'inviante,
   anamnesi, diagnosi note, farmaci rilevanti.
2. **Condizioni di validità** — vista, udito, motricità, interferenza linguistica,
   dolore, affaticamento, sonno, vigilanza, collaborazione, caregiver: riportate nel
   referto e considerate nell'affidabilità del profilo.
3. **Batteria di primo livello** — composta liberamente dal catalogo (batteria di base
   suggerita, mai rigida), con durata stimata.
4. **Somministrazione** — per ogni prova: stato (completata / non eseguita / non
   interpretabile con motivo), cronometro, punteggio grezzo validato sul range del
   test, tempo, errori, autocorrezioni, intrusioni, perseverazioni, punteggio corretto,
   classificazione del clinico, note qualitative.
5. **Profilo per domini** (13 domini + screening) — prove disponibili/somministrate,
   qualità e coerenza del dato, fattori interferenti, sintesi descrittiva, affidabilità;
   giudizio automatico = caso peggiore tra le classificazioni del clinico (mai una
   media), sempre sostituibile da un giudizio motivato del clinico.
6. **Secondo livello adattivo** — proposte da regole trasparenti (richiamo vs
   riconoscimento, fluenze vs denominazione, incoerenze → validità, autonomia →
   colloquio caregiver, errori qualitativi, multidominio → impatto funzionale); ogni
   proposta dichiara perché è stata generata e con che priorità; il clinico accetta,
   rifiuta o aggiunge moduli.
7. **Confronto longitudinale** — tra valutazioni con lo stesso "codice paziente":
   variazioni di punteggi grezzi, tempi, errori e classificazioni per le prove
   completate in entrambe, variazioni dei giudizi di dominio (incluse autonomia,
   umore e comportamento), prove presenti in una sola valutazione, lettura clinica
   del confronto. Sempre descrittivo: limiti espliciti su effetto pratica e assenza
   di RCI, nessuna variazione dichiarata significativa. Il pulsante "Controllo"
   crea la valutazione di follow-up copiando batteria e dati stabili.
8. **Referto** — 14 sezioni + firma (dati, quesito, anamnesi, comportamento, validità,
   tabella risultati, domini, osservazioni qualitative da regole descrittive, sintesi,
   confronto longitudinale, limiti, conclusioni, indicazioni, follow-up); sempre
   modificabile, con versionamento, copia, stampa/PDF ed esportazione strutturata.

## Catalogo test e principi

Il catalogo (50+ voci: screening, attenzione/velocità, memoria, linguaggio, esecutive,
visuospaziale/prassie, funzionamento/umore/comportamento) contiene **solo metadati
organizzativi**: nome, sigla, domini, durata, modalità, range del punteggio (solo dove
è un fatto notorio del formato, usato per validare l'inserimento e mai per
classificare), tipi di errore, stato della licenza, stato di configurazione.

- Nessuno stimolo, istruzione o materiale di test protetto.
- Nessuna norma, percentile, equivalente, cut-off o formula di correzione integrata.
- Gli strumenti protetti restano **licenza da verificare** e **sola registrazione manuale**;
  gli strumenti aperti riportano fonte e licenza e possono avere una compilazione guidata.
- Nessuna diagnosi automatica: classificazioni e giudizi sono sempre del clinico.

## Somministrazione guidata (v5)

- Due interfacce nello stesso dispositivo: **medico**, con spiegazione prima/durante/dopo,
  registrazione e motivazione del prossimo passaggio; **assistito**, che nasconde dati clinici,
  interpretazioni e strumenti riservati.
- Il pulsante “Apri il prossimo passaggio” segue una regola trasparente: prima prova incompleta,
  revisione del profilo, quindi approfondimenti di secondo livello. Il medico mantiene sempre il
  controllo della batteria.
- Primo strumento completo: **WHO-5 italiano**, fonte OMS 2024, licenza
  CC BY-NC-SA 3.0 IGO. Calcola solo grezzo 0–25 e percentuale; l’eventuale proposta di
  approfondimento dell’umore riprende l’indicazione della fonte e non è una diagnosi.
- MoCA, MMSE e gli altri strumenti protetti restano schede guidate senza item o istruzioni:
  richiedono materiale originale, versione e autorizzazioni appropriate.

### Materiali con licenza (v7)

La Home accetta pacchetti JSON locali `neuroscreen-materiali`. In questo modo l’interfaccia,
lo scoring grezzo e il passaggio medico/assistito sono già pronti per tutti i test del catalogo,
ma il repository pubblico non distribuisce contenuti protetti. Ogni pacchetto deve indicare
test, titolo, versione, fonte e riferimento della licenza confermata. Gli item possono essere
di tipo `scelta`, `testo`, `numero` o `nota`; le opzioni possono avere punti e un indicatore di
allerta clinica. L’app calcola soltanto il grezzo, non interpreta automaticamente il risultato.

Esempio minimo:

```json
{"app":"neuroscreen-materiali","formato":1,"test":"mmse",
 "titolo":"Titolo autorizzato","versione":"versione","fonte":"editore/manuale",
 "licenza":{"confermata":true,"riferimento":"numero o documento"},
 "istruzioniMedico":"...","istruzioniAssistito":"...",
 "items":[{"id":"i1","tipo":"scelta","testoMedico":"...","testoAssistito":"...",
   "opzioni":[{"valore":"0","etichetta":"...","punti":0},{"valore":"1","etichetta":"...","punti":1}]}]}
```

## Motore di scoring

Separato dall'interfaccia (`scoreTest`), vuoto per progetto. Le norme si aggiungono
SOLO importando **pacchetti normativi JSON** con fonte verificabile obbligatoria,
senza toccare il codice:

```json
{ "app":"neuroscreen-norme", "formato":1, "test":"mmse",
  "fonte":"<pubblicazione>", "versione":"<anno>",
  "richiede":["eta","scolarita"],
  "correzioni":[{"etaMin":70,"etaMax":79,"scolMin":6,"scolMax":10,"aggiustamento":1.5}],
  "classi":[{"min":0,"max":10,"etichetta":"..."}] }
```

Se la fonte manca o non copre il caso, il motore risponde:
*"Norme non integrate. Inserire manualmente il punteggio corretto o configurare una
fonte normativa validata."* — e il punteggio corretto resta inseribile a mano.

## Dati e privacy (versione dimostrativa)

- Tutto in `localStorage` (chiave `neuroscreen_v1`), salvataggio automatico anche alla
  chiusura della pagina; nessuna chiamata di rete.
- Solo pseudonimi: l'abbinamento codice–persona va tenuto fuori dall'app.
- Export/import JSON validati (formato 2, migrazione automatica dal formato 1),
  cancellazione totale con doppia conferma, sessione dimostrativa con dati fittizi.

## Controlli

- `npm run check` — 46 test senza dipendenze su catalogo, modello dati, validazioni,
  motore di scoring (incl. pacchetto fittizio di collaudo usato solo nei test),
  profilo, regole adattive, referto, import/migrazione e vincoli (nessuna risorsa
  esterna, nessun cut-off nel codice, nessun termine diagnostico nei testi generati).
- `node smoke.js` — end-to-end opzionale in Chromium (richiede `playwright-core`):
  percorso completo degli 8 passi (incluso il confronto longitudinale con la coppia
  demo) su desktop, tablet e smartphone, cronometro, validazioni, persistenza dopo
  ricarica, tocchi ≥44 px, zero errori console.

## Limiti noti

- Il confronto longitudinale è puramente descrittivo: senza correzioni per effetto
  pratica né indici di cambiamento affidabile (RCI), che potranno entrare in futuro
  tramite i pacchetti normativi.
- PDF tramite stampa del browser (niente impaginazione dedicata).
- localStorage non cifrato; autenticazione/ruoli/audit richiederanno un backend
  (architettura predisposta: logica pura separata, dati esportabili in JSON).
- L'algoritmo adattivo è a regole semplici e dichiarate, non validato: ogni proposta
  mostra le sue motivazioni ed è pensata per essere sempre supervisionata.

Vedi `ANALISI.md` per la relazione iniziale sull'analisi del repository.
