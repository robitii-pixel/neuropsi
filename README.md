# NeuroScreen — orientamento e formazione

Strumento **locale** di orientamento alla valutazione neuropsicologica e addestramento:
mappa il quesito sui domini, presenta schede formative dei test, significato clinico ed
esempi originali. Un solo file (`index.html`), nessun backend, nessuna dipendenza: si apre
con un doppio clic in qualunque browser moderno, anche offline.

**Non è un test neuropsicologico e non produce dati clinici dalle esercitazioni.**

## Percorso didattico (v14)

- Otto punti di partenza: memoria, attenzione/lentezza, linguaggio, funzioni esecutive,
  visuospaziale/prassie, cambiamento globale, umore/comportamento, autonomia.
- Flow chart automatica: quesito → domini principali → famiglie di strumenti → lettura
  integrata con validità, errori qualitativi, autonomia e anamnesi.
- Schede formative ricavate dal catalogo di 55 strumenti, mostrate in gruppi pertinenti di
  massimo 12, con scopo, significato clinico, esempio originale e stato dei materiali.
  Nessun item, tavola, consegna standardizzata, norma o soglia dei test protetti.
- Palestra di conduzione con fluenze, span, cancellazione e orientamento generati dall'app.
  I risultati restano solo sullo schermo: non vengono salvati e non alimentano profilo,
  confronto o referto.
- Il precedente registro resta accessorio per organizzare risultati ottenuti separatamente
  con materiali originali, autorizzazioni e norme appropriate.

## Aree separate (v15)

Formazione e registro professionale sono due ambienti distinti. La pagina iniziale presenta
solo le due scelte; una barra superiore sempre visibile permette di passare direttamente da
un'area all'altra. Nel percorso didattico non vengono mostrati né la sessione attiva né gli
otto passi clinici. Il registro mantiene casi, profili e referti senza mescolarli alle schede
formative.

## Profili simulati (v16)

Il percorso didattico include otto casi interamente inventati: profilo amnestico lieve e
maggiore, disesecutivo-rallentato, linguistico, visuospaziale-prassico, condizionato da
umore/sonno/fatica, possibile disturbo cognitivo funzionale e cambiamento acuto fluttuante.
Ogni caso separa pattern, autonomia, validità, ipotesi funzionale, alternative e passi
successivi. Le formulazioni non attribuiscono automaticamente un'eziologia; il caso acuto
indica di interrompere i test e attivare una valutazione medica tempestiva.

## Compositore multidominio (v17)

Nel percorso didattico è possibile selezionare due o più domini cognitivi, modificare
l'autonomia simulata e dichiarare se i dati sono attendibili. L'app costruisce un esempio di
formulazione funzionale multidominio (per esempio amnestico-dysexecutive,
attentivo-dysexecutive rallentato, amnestico-linguistico o visuospaziale-prassico). Se la
validità è insufficiente la formulazione viene sospesa; la distinzione lieve/maggiore segue
lo scenario di autonomia e resta esplicitamente didattica, non diagnostica.

## Problemi iniziali combinati (v18)

Il primo passaggio della flow chart è multiselezione: memoria, disattenzione/lentezza,
linguaggio, disorganizzazione/rigidità, visuospaziale/prassico, cambiamento globale,
umore/comportamento e autonomia possono essere scelti contemporaneamente. La mappa unisce
i domini principali, elimina i duplicati, separa quelli complementari e aggiorna le schede
pertinenti. L'ordine di selezione non attribuisce priorità o gravità clinica.

## Percorso clinico (8 passi)

1. **Sessione e quesito** — codice pseudonimo obbligatorio; età, sesso, scolarità,
   lingua madre, professione, lateralità; quesito clinico, sospetto dell'inviante,
   anamnesi, diagnosi note, farmaci rilevanti.
2. **Condizioni di validità** — vista, udito, motricità, interferenza linguistica,
   dolore, affaticamento, sonno, vigilanza, collaborazione, caregiver: riportate nel
   referto e considerate nell'affidabilità del profilo.
3. **Batteria di primo livello** — composta liberamente dal catalogo (batteria di base
   suggerita, mai rigida), con durata stimata.
4. **Registro accessorio** — per ogni prova: stato (completata / non eseguita / non
   interpretabile con motivo), cronometro, punteggio grezzo validato sul range del
   test, tempo, errori, autocorrezioni, intrusioni, perseverazioni, versione della
   prova, punteggio corretto, classificazione del clinico, note qualitative. I dati
   devono provenire da strumenti disponibili legittimamente fuori dall'app.
   Indicatore di avanzamento, apertura/chiusura di tutte le schede e disposizione
   a due colonne sugli schermi larghi (tablet in orizzontale e desktop).
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
   del confronto. Se la **versione della prova** registrata differisce tra le due
   valutazioni, il confronto viene marcato come non attendibile. Sempre descrittivo: limiti espliciti su effetto pratica e assenza
   di RCI, nessuna variazione dichiarata significativa. Il pulsante "Controllo"
   crea la valutazione di follow-up copiando batteria e dati stabili.
8. **Referto** — 14 sezioni + firma (dati, quesito, anamnesi, comportamento, validità,
   tabella risultati, domini, osservazioni qualitative da regole descrittive, sintesi,
   confronto longitudinale, limiti, conclusioni, indicazioni, follow-up); sempre
   modificabile, con versionamento, copia, stampa/PDF, scaricamento come testo (TXT)
   ed esportazione in **formato strutturato** (JSON documentato, `neuroscreen-referto`
   formato 1) leggibile da gestionali e script senza interpretare testo libero.

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

## Strumenti aperti integrati (v8)

- **WHO-5 italiano**: 5 item, grezzo 0–25 e percentuale 0–100.
- **PHQ-9 italiano**: 9 item più impatto funzionale, grezzo 0–27. Una risposta diversa
  da “Mai” all’item 9 attiva un avviso di revisione clinica immediata, indipendente dal totale.
- **GAD-7 italiano**: 7 item, grezzo 0–21.

Nell’interfaccia assistito non vengono mostrate fasce interpretative o diagnosi; il medico vede
il grezzo, la fonte e gli eventuali avvisi di sicurezza.

## Referto impaginato e licenze (v9)

Il referto mostra e stampa un’intestazione clinica, una tabella strutturata con stato,
punteggio grezzo, corretto, classificazione, tempo ed errori, seguita dalla sintesi narrativa.
Il prospetto `LICENZE.md` separa strumenti aperti, gratuiti, a pagamento e voci generiche,
con una prima stima dei costi ufficiali verificabili.

## Anteprima dal vivo e strumenti gratuiti (v10)

La modifica del testo del referto aggiorna immediatamente l’anteprima impaginata. ACE-III
dispone del collegamento diretto alla versione italiana ufficiale gratuita; M-ACE rimanda alla
pagina ufficiale FRONTIER perché nell’elenco corrente non è presente una traduzione italiana.
Entrambi mantengono registrazione completa di grezzo, tempo, errori e classificazione.

## Referto senza duplicazioni (v11)

Nell’anteprima e nel PDF i dati identificativi compaiono soltanto nell’intestazione e i risultati
soltanto nella tabella impaginata. La narrativa mantiene quesito, anamnesi, validità, profilo,
osservazioni, conclusioni e indicazioni senza ripetere intestazione e punteggi.

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

- `npm run check` — 70+ test senza dipendenze su catalogo, percorso formativo,
  separazione tra esercitazioni e dati clinici, modello dati, validazioni,
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
