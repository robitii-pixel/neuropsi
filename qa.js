#!/usr/bin/env node
/* Suite QA di NeuroScreen Clinico (schema 2).
   Estrae il blocco di logica pura da index.html (marcatori NS-LOGIC) e
   verifica catalogo, modello dati, validazioni, motore di scoring,
   profilo per domini, selezione adattiva, referto, import e migrazione.
   Nessuna dipendenza esterna. Uso: npm run check */
"use strict";
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const fullScript=html.match(/<script>([\s\S]*?)<\/script>/);
if(!fullScript){console.error("FATALE: script principale non trovato");process.exit(1);}
try{new Function(fullScript[1]);}
catch(e){console.error("FATALE: JavaScript completo non valido:",e.message);process.exit(1);}
const m=html.match(/\/\*NS-LOGIC-START\*\/([\s\S]*?)\/\*NS-LOGIC-END\*\//);
if(!m){console.error("FATALE: marcatori NS-LOGIC non trovati in index.html");process.exit(1);}
const ctx={console};
vm.createContext(ctx);
const EXPORTS=["APPV","LS_KEY","SCHEMA","RATINGS","RATING_LABEL","DOMS","DOM_BY_ID","domName",
  "CATS","TESTS","TEST_BY_ID","BATTERIA_BASE","VALIDITA","validitaInterferenze",
  "TEST_GUIDES","testGuide","who5Score","guidedNext",
  "newSession","newSomm","validateCode","validateAnagrafica","validateSomm",
  "MSG_NO_NORME","validateNormPack","validateMaterialPack","materialScore","OPEN_MATERIALS","materialForTest","scoreTest","testsOfDomain","domainProfile","profileHash",
  "MODULES","MODULE_BY_ID","proposeModules","mergeSecondLevel",
  "LIMITI_CONFRONTO","comparableSessions","compareSessions","comparisonText","newFollowUp",
  "fmtDateIT","fmtSec","qualitativePhrases","resultsTable","buildReport","buildStructuredReport",
  "exportPayload","sanitizeSession","migrateV1","parseImport","demoSession","demoSessions","nowISO","uid"];
try{
  vm.runInContext(m[1]+"\n;this.__NS={"+EXPORTS.join(",")+"};",ctx,{filename:"index.html <logica>"});
}catch(e){
  console.error("FATALE: il blocco di logica non si esegue:",e.message);process.exit(1);
}
const L=ctx.__NS;

let passed=0,failed=0;
function t(nome,fn){
  try{fn();passed++;console.log("  ok  "+nome);}
  catch(e){failed++;console.error("  FAIL "+nome+" — "+e.message);}
}
function eq(a,b,msg){
  const ja=JSON.stringify(a),jb=JSON.stringify(b);
  if(ja!==jb)throw new Error((msg||"valori diversi")+": atteso "+jb+", ottenuto "+ja);
}
function ok(v,msg){if(!v)throw new Error(msg||"condizione falsa");}

console.log("QA NeuroScreen Clinico — "+L.APPV+" (schema "+L.SCHEMA+")");

/* ---------- catalogo ---------- */
t("catalogo: >=45 test, id e sigle uniche, categorie e domini validi",()=>{
  ok(L.TESTS.length>=45,"attesi almeno 45 test, trovati "+L.TESTS.length);
  eq(new Set(L.TESTS.map(x=>x.id)).size,L.TESTS.length,"id duplicati");
  eq(new Set(L.TESTS.map(x=>x.sigla)).size,L.TESTS.length,"sigle duplicate");
  const catIds=new Set(L.CATS.map(c=>c.id));
  const domIds=new Set(["screening"].concat(L.DOMS.map(d=>d.id)));
  L.TESTS.forEach(x=>{
    ok(catIds.has(x.cat),"categoria inesistente in "+x.id);
    ok(domIds.has(x.dom),"dominio inesistente in "+x.id+": "+x.dom);
    x.domSec.forEach(d=>ok(domIds.has(d),"dominio secondario inesistente in "+x.id));
  });
});
t("catalogo: campi richiesti presenti su ogni test",()=>{
  const campi=["id","sigla","nome","cat","dom","domSec","versione","lingua","etaRange","durataMin",
    "sommin","scoring","min","max","usaTempo","tipiErrore","fonteNormativa","biblio","licenza",
    "digitale","soloManuale","normeIntegrate","noteCliniche","configV","statoConfig"];
  L.TESTS.forEach(x=>campi.forEach(c=>ok(c in x,"manca "+c+" in "+x.id)));
});
t("catalogo: strumenti protetti manuali; strumenti aperti identificati",()=>{
  L.TESTS.forEach(x=>{
    eq(x.normeIntegrate,false,x.id+" risulta con norme integrate");
    eq(x.fonteNormativa,null,x.id+" ha una fonte normativa nel codice");
    if(x.licenza==="aperta"){eq(x.soloManuale,false,x.id+" aperto ma solo manuale");ok(x.digitale,x.id+" aperto ma non digitale");}
    else eq(x.soloManuale,true,x.id+" non è a sola registrazione manuale");
    ok(["da-verificare","generico","aperta","gratuita-ufficiale"].includes(x.licenza),"licenza inattesa in "+x.id);
  });
  ok(!/cut-?off\s*[:=]\s*\d/i.test(html),"possibile cut-off numerico nel codice");
});
t("WHO-5: fonte, cinque item e scoring completo",()=>{
  ok(L.TEST_BY_ID.who5&&L.TEST_BY_ID.who5.licenza==="aperta");
  eq(L.TEST_GUIDES.who5.items.length,5);
  eq(L.who5Score({risposte:{0:5,1:4,2:3,3:2,4:1}}),{grezzo:15,percentuale:60,approfondire:true});
  eq(L.who5Score({risposte:{0:5,1:5}}),null);
});
const packMateriale={app:"neuroscreen-materiali",formato:1,test:"mmse",titolo:"Materiale autorizzato di collaudo",versione:"X",
  fonte:"Fonte fittizia QA",licenza:{confermata:true,riferimento:"LIC-QA"},items:[
    {id:"a",tipo:"scelta",testoMedico:"Item A",opzioni:[{valore:"0",etichetta:"No",punti:0},{valore:"1",etichetta:"Sì",punti:1,allerta:true}],sicurezza:true},
    {id:"b",tipo:"testo",testoMedico:"Nota"}]};
t("materiali autorizzati: licenza obbligatoria, schema e scoring",()=>{
  eq(L.validateMaterialPack(packMateriale),null);
  ok(L.validateMaterialPack(Object.assign({},packMateriale,{licenza:{confermata:false,riferimento:""}})));
  eq(L.materialScore(packMateriale,{risposte:{a:"1",b:"nota"}}),{completo:true,completi:2,totale:1,allerta:true});
});
t("PHQ-9 e GAD-7: materiali italiani completi, scoring e sicurezza",()=>{
  const phq=L.materialForTest("depressione",[]),gad=L.materialForTest("ansia",[]);
  eq(L.validateMaterialPack(phq),null);eq(L.validateMaterialPack(gad),null);
  eq(phq.items.length,10);eq(gad.items.length,7);
  const rp=Object.fromEntries(phq.items.map(x=>[x.id,"0"]));rp.p9="1";
  const sp=L.materialScore(phq,{risposte:rp});ok(sp.completo);eq(sp.totale,1);ok(sp.allerta);
  const rg=Object.fromEntries(gad.items.map(x=>[x.id,"3"]));eq(L.materialScore(gad,{risposte:rg}).totale,21);
});
t("flusso guidato: apre la prima prova incompleta e propone approfondimento WHO-5",()=>{
  const s=L.newSession("QA-FLOW");s.batteria=["who5","orientamento"];
  eq(L.guidedNext(s).test,"who5");
  s.somministrazioni.who5=Object.assign(L.newSomm(),{stato:"completato",risposte:{0:1,1:1,2:1,3:1,4:1}});
  eq(L.guidedNext(s).add,"depressione");
  s.batteria.push("depressione");
  eq(L.guidedNext(s).test,"orientamento");
});
t("catalogo: i gruppi richiesti sono coperti",()=>{
  const bySigla=Object.fromEntries(L.TESTS.map(x=>[x.sigla,x]));
  ["MMSE","MoCA","ACE-III","M-ACE","FAB","DS-F","CS-F","TMT-A","TMT-B","SDMT","STROOP",
   "TOKEN","CDT","ADL","IADL","CBI"].forEach(s=>ok(bySigla[s],"manca "+s));
});
t("batteria di base: id validi e copertura delle aree minime",()=>{
  L.BATTERIA_BASE.forEach(id=>ok(L.TEST_BY_ID[id],"id inesistente in batteria base: "+id));
  const doms=new Set();
  L.BATTERIA_BASE.forEach(id=>{const x=L.TEST_BY_ID[id];doms.add(x.dom);x.domSec.forEach(d=>doms.add(d));});
  ["screening","attenzione","mdl","mem-verbale","linguaggio","esecutive","visuospaziale","prassie","autonomia","umore","comportamento"]
    .forEach(d=>ok(doms.has(d),"area non coperta dalla batteria base: "+d));
});

/* ---------- modello dati e validazioni ---------- */
t("newSession: struttura schema 2 completa",()=>{
  const s=L.newSession("QA-1");
  ["anagrafica","quesito","validita","batteria","somministrazioni","osservazioni","profilo","secondLevel","referto"]
    .forEach(k=>ok(k in s,"manca "+k));
  ["etaAnni","sesso","scolaritaAnni","linguaMadre","professione","lateralita"].forEach(k=>ok(k in s.anagrafica,"manca anagrafica."+k));
  ["quesitoClinico","sospettoDiagnostico","anamnesi","diagnosiNote","farmaci"].forEach(k=>ok(k in s.quesito,"manca quesito."+k));
  ok(Array.isArray(s.referto.versioni));
});
t("validateCode e validateAnagrafica",()=>{
  ok(L.validateCode(""),"vuoto accettato");
  ok(L.validateCode("mario rossi"),"spazi accettati");
  eq(L.validateCode("NP-2026-014"),null);
  const e=L.validateAnagrafica({etaAnni:"130",scolaritaAnni:"31",dataValutazione:"2099-01-01"});
  ok(e.etaAnni&&e.scolaritaAnni&&e.dataValutazione,"fuori range non segnalato");
  eq(Object.keys(L.validateAnagrafica({etaAnni:"",scolaritaAnni:"",dataValutazione:""})).length,0);
});
t("validateSomm: numeri, range del test, motivo obbligatorio per non interpretabile",()=>{
  ok(L.validateSomm("mmse",Object.assign(L.newSomm(),{grezzo:"31"})).grezzo,"31 su MMSE accettato");
  ok(L.validateSomm("mmse",Object.assign(L.newSomm(),{grezzo:"abc"})).grezzo,"grezzo non numerico accettato");
  ok(L.validateSomm("mmse",Object.assign(L.newSomm(),{errori:"-1"})).errori,"errori negativi accettati");
  ok(L.validateSomm("mmse",Object.assign(L.newSomm(),{stato:"non-interpretabile"})).motivo,"NI senza motivo accettato");
  eq(Object.keys(L.validateSomm("mmse",Object.assign(L.newSomm(),{stato:"non-interpretabile",motivo:"agitazione"}))).length,0);
  ok(L.validateSomm("mmse",Object.assign(L.newSomm(),{stato:"completato"})).grezzo,"completata senza grezzo né classificazione accettata");
  eq(Object.keys(L.validateSomm("mmse",Object.assign(L.newSomm(),{stato:"completato",grezzo:"27"}))).length,0);
  eq(Object.keys(L.validateSomm("tmt-a",Object.assign(L.newSomm(),{stato:"completato",classif:"norma",tempoSec:"48"}))).length,0,"classificazione senza grezzo deve bastare");
});
t("validitaInterferenze: distingue interferenti e da segnalare",()=>{
  const r=L.validitaInterferenze({vista:3,udito:2,dolore:1});
  eq(r.interferenti.length,1);eq(r.daSegnalare.length,1);
  eq(L.validitaInterferenze({}).interferenti.length,0);
});

/* ---------- motore di scoring ---------- */
t("scoring: senza pacchetto, messaggio esatto richiesto",()=>{
  const r=L.scoreTest("mmse",{grezzo:"25",etaAnni:"74",scolaritaAnni:"8"},[]);
  eq(r.disponibile,false);
  eq(r.messaggio,"Norme non integrate. Inserire manualmente il punteggio corretto o configurare una fonte normativa validata.");
});
/* pacchetto FITTIZIO usato SOLO nei test automatici, mai nell'app */
const packFinto={app:"neuroscreen-norme",formato:1,test:"mmse",
  fonte:"Fonte fittizia di collaudo (QA)",versione:"test",richiede:["eta","scolarita"],
  correzioni:[{etaMin:70,etaMax:79,scolMin:6,scolMax:10,aggiustamento:1.5},
              {etaMin:60,etaMax:69,scolMin:6,scolMax:10,aggiustamento:0.5}],
  classi:[{min:0,max:10,etichetta:"classe A (fittizia)"},{min:10.01,max:40,etichetta:"classe B (fittizia)"}]};
t("scoring: pacchetto valido applicato con fonte citata e avvisi",()=>{
  eq(L.validateNormPack(packFinto),null);
  const r=L.scoreTest("mmse",{grezzo:"25",etaAnni:"74",scolaritaAnni:"8"},[packFinto]);
  eq(r.disponibile,true);
  eq(r.corretto,26.5);
  eq(r.classe,"classe B (fittizia)");
  ok(r.fonte.includes("fittizia"));
  ok(r.avvisi.length>=1,"nessun avviso sui limiti");
});
t("scoring: combinazione non coperta e dati mancanti gestiti",()=>{
  const fuori=L.scoreTest("mmse",{grezzo:"25",etaAnni:"90",scolaritaAnni:"8"},[packFinto]);
  eq(fuori.disponibile,false);
  ok(/non copre/.test(fuori.messaggio));
  const senzaEta=L.scoreTest("mmse",{grezzo:"25",etaAnni:"",scolaritaAnni:"8"},[packFinto]);
  eq(senzaEta.disponibile,false);
  ok(/Età mancante/.test(senzaEta.messaggio));
  const senzaGrezzo=L.scoreTest("mmse",{grezzo:"",etaAnni:"74",scolaritaAnni:"8"},[packFinto]);
  eq(senzaGrezzo.disponibile,false);
});
t("scoring: pacchetti non validi rifiutati (senza fonte, formato errato, test ignoto)",()=>{
  ok(L.validateNormPack(null));
  ok(L.validateNormPack({app:"altro"}));
  ok(L.validateNormPack(Object.assign({},packFinto,{fonte:""})),"pacchetto senza fonte accettato");
  ok(L.validateNormPack(Object.assign({},packFinto,{formato:2})));
  ok(L.validateNormPack(Object.assign({},packFinto,{test:"inesistente"})));
  ok(L.validateNormPack(Object.assign({},packFinto,{correzioni:[{etaMin:1}]})));
});

/* ---------- profilo per domini ---------- */
function sessioneProve(){
  const s=L.newSession("QA-P");
  s.batteria=["lista-appr","lista-diff","lista-ric","tmt-a","denominazione","fluenza-fon","fluenza-sem","adl"];
  const set=(id,vals)=>{s.somministrazioni[id]=Object.assign(L.newSomm(),vals);};
  set("lista-appr",{stato:"completato",grezzo:"28",classif:"deficit",intrusioni:"2"});
  set("lista-diff",{stato:"completato",grezzo:"2",classif:"deficit"});
  set("lista-ric",{stato:"completato",grezzo:"13",classif:"norma"});
  set("tmt-a",{stato:"completato",grezzo:"52",tempoSec:"52",classif:"norma"});
  set("denominazione",{stato:"completato",grezzo:"48",classif:"norma"});
  set("fluenza-fon",{stato:"completato",grezzo:"18",classif:"deficit",perseverazioni:"3"});
  set("fluenza-sem",{stato:"non-interpretabile",motivo:"interruzione della prova"});
  set("adl",{stato:"completato",grezzo:"4",classif:"deficit"});
  return s;
}
t("profilo: giudizio = caso peggiore, mai media; incoerenza rilevata",()=>{
  const s=sessioneProve();
  const p=L.domainProfile(s);
  eq(p["mem-verbale"].giudizio,"deficit");
  ok(p["mem-verbale"].incoerente,"deficit+norma nello stesso dominio non segnalato come incoerente");
  eq(p["velocita"].giudizio,"norma");
  eq(p["autonomia"].giudizio,"deficit");
  eq(p["mem-visiva"].inBatteria.length,0);
});
t("profilo: affidabilità considera numero prove, incoerenze e interferenze",()=>{
  const s=sessioneProve();
  const p1=L.domainProfile(s);
  ok(p1["mem-verbale"].affidabilita!=="alta","incoerente ma affidabilità alta");
  eq(p1["velocita"].affidabilita,"media","una sola prova completata deve dare affidabilità media");
  s.validita.valori={vista:3,vigilanza:3};
  const p2=L.domainProfile(s);
  ok(p2["velocita"].affidabilita==="bassa","due fattori interferenti devono abbassare l'affidabilità");
});
t("profilo: override del clinico prevale e viene marcato",()=>{
  const s=sessioneProve();
  s.profilo.override["velocita"]={giudizio:"borderline",nota:"rallentamento ai limiti"};
  const p=L.domainProfile(s);
  eq(p["velocita"].giudizio,"borderline");
  ok(p["velocita"].override);
  ok(L.profileHash(s)!==L.profileHash(L.newSession("x")),"hash insensibile ai giudizi");
});
t("profilo: prove non interpretabili e non eseguite conteggiate, non classificate",()=>{
  const s=L.newSession("QA-NI");
  s.batteria=["mmse","tmt-a"];
  s.somministrazioni["mmse"]=Object.assign(L.newSomm(),{stato:"non-interpretabile",motivo:"rifiuto"});
  s.somministrazioni["tmt-a"]=Object.assign(L.newSomm(),{stato:"non-eseguito"});
  const p=L.domainProfile(s);
  eq(p["screening"].giudizio,"na");
  eq(p["screening"].nonInterpretabili,1);
  eq(p["velocita"].nonEseguite,1);
});

/* ---------- selezione adattiva ---------- */
t("adattivo: richiamo giù + riconoscimento conservato → strategie di recupero",()=>{
  const s=sessioneProve();
  const pr=L.proposeModules(s);
  const ids=pr.map(x=>x.id);
  ok(ids.includes("strategie-recupero"),"manca strategie-recupero");
  const sr=pr.find(x=>x.id==="strategie-recupero");
  ok(sr.motivi.some(m=>/riconoscimento/.test(m)),"motivazione non esplicita");
});
t("adattivo: fluenze giù + denominazione ok → esecutivo; perseverazioni motivate",()=>{
  const s=sessioneProve();
  const pr=L.proposeModules(s);
  const ex=pr.find(x=>x.id==="esecutivo");
  ok(ex,"manca modulo esecutivo");
  ok(ex.motivi.some(m=>/denominazione conservata/.test(m)));
  ok(ex.motivi.some(m=>/[Pp]erseverazioni/.test(m)));
});
t("adattivo: autonomia ridotta → funzionale-caregiver; amnestico da deficit mnesici",()=>{
  const s=sessioneProve();
  const pr=L.proposeModules(s);
  ok(pr.some(x=>x.id==="funzionale-caregiver"));
  const am=pr.find(x=>x.id==="amnestico");
  ok(am&&am.priorita==="alta");
});
t("adattivo: incoerenza interna → modulo di validità",()=>{
  const s=sessioneProve();
  ok(L.proposeModules(s).some(x=>x.id==="validita"),"incoerenza non intercettata");
});
t("adattivo: profilo nei limiti → nessuna proposta",()=>{
  const s=L.newSession("QA-OK");
  s.batteria=["mmse","tmt-a"];
  s.somministrazioni["mmse"]=Object.assign(L.newSomm(),{stato:"completato",grezzo:"29",classif:"norma"});
  s.somministrazioni["tmt-a"]=Object.assign(L.newSomm(),{stato:"completato",grezzo:"40",classif:"norma"});
  eq(L.proposeModules(s).length,0);
});
t("adattivo: sospetto clinico citato nelle motivazioni, senza generare proposte da solo",()=>{
  const s=sessioneProve();
  s.quesito.sospettoDiagnostico="sospetto disturbo neurocognitivo (esempio)";
  const pr=L.proposeModules(s);
  ok(pr.every(x=>x.motivi.some(m=>/sospetto clinico/.test(m))));
  const s2=L.newSession("QA-S");
  s2.quesito.sospettoDiagnostico="qualunque";
  eq(L.proposeModules(s2).length,0,"il solo sospetto non deve generare proposte");
});
t("merge secondo livello: conserva decisioni, manuali e voci compilate non più proposte",()=>{
  const s=sessioneProve();
  const p1=L.proposeModules(s);
  let items=L.mergeSecondLevel({items:[]},p1);
  items.find(i=>i.id==="amnestico").esito="deficit";
  items.find(i=>i.id==="validita").incluso=false;
  items.push({id:"umore",origine:"manuale",priorita:"media",motivi:[],incluso:true,esito:"na",strumento:"",note:""});
  const items2=L.mergeSecondLevel({items},p1);
  eq(items2.find(i=>i.id==="amnestico").esito,"deficit");
  eq(items2.find(i=>i.id==="validita").incluso,false);
  ok(items2.some(i=>i.id==="umore"&&i.origine==="manuale"));
  const items3=L.mergeSecondLevel({items:items2},[]);
  ok(items3.some(i=>i.id==="amnestico"&&i.origine==="proposta-precedente"),"voce compilata persa");
  ok(!items3.some(i=>i.id==="validita"),"voce esclusa e non compilata doveva sparire");
});

/* ---------- referto ---------- */
t("referto: tutte le sezioni previste presenti",()=>{
  const s=sessioneProve();
  const r=L.buildReport(s,[]);
  ["1. DATI ESSENZIALI","2. QUESITO CLINICO","3. ANAMNESI","4. COMPORTAMENTO","5. CONDIZIONI DI VALIDITÀ",
   "6. PROVE SOMMINISTRATE","7. RISULTATI PER DOMINIO","8. OSSERVAZIONI QUALITATIVE","9. SINTESI DEL PROFILO",
   "10. CONFRONTO","11. LIMITI","12. CONCLUSIONI","13. INDICAZIONI","14. FOLLOW-UP","Firma del professionista"]
    .forEach(x=>ok(r.includes(x),"manca sezione: "+x));
  ok(r.includes("Non costituisce diagnosi"));
});
t("referto: tabella risultati con stati e frasi qualitative da regole",()=>{
  const s=sessioneProve();
  const r=L.buildReport(s,[]);
  ok(r.includes("non interpretabile"),"stato NI assente dalla tabella");
  ok(r.includes("Ridotta acquisizione"),"frase su acquisizione mancante");
  ok(r.includes("beneficio relativo dal riconoscimento"),"frase richiamo/riconoscimento mancante");
  ok(r.includes("intrusioni"),"intrusioni non riportate");
  ok(r.includes("perseverazioni"),"perseverazioni non riportate");
  ok(r.includes("interruzione della prova"),"motivo NI non riportato");
});
t("referto: niente termini diagnostici automatici",()=>{
  const s=sessioneProve();
  const r=L.buildReport(s,[]);
  ok(!/diagnosi di|demenza|alzheimer|\bMCI\b|deterioramento cognitivo lieve/i.test(r),"termini diagnostici nel referto automatico");
});
t("referto: punteggio del motore riportato con asterisco e fonte quando disponibile",()=>{
  const s=L.newSession("QA-N");
  s.anagrafica.etaAnni="74";s.anagrafica.scolaritaAnni="8";
  s.batteria=["mmse"];
  s.somministrazioni["mmse"]=Object.assign(L.newSomm(),{stato:"completato",grezzo:"25",classif:"borderline"});
  const r=L.buildReport(s,[packFinto]);
  ok(r.includes("26.5*"),"corretto calcolato assente");
  ok(r.includes("fonte normativa importata"),"nota sull'asterisco assente");
});
t("fmtSec e fmtDateIT",()=>{
  eq(L.fmtSec("52"),"52″");eq(L.fmtSec("90"),"1′30″");eq(L.fmtSec(""),"");
  eq(L.fmtDateIT("2026-07-12"),"12/07/2026");
});

/* ---------- import/export e migrazione ---------- */
t("export→import (formato 2): giro completo senza perdite",()=>{
  const s=sessioneProve();
  s.validita.valori={vista:3};
  s.profilo.override["velocita"]={giudizio:"borderline",nota:"x"};
  s.referto.versioni.push({n:1,testo:"bozza v1",salvatoAt:L.nowISO()});
  const res=L.parseImport(JSON.stringify(L.exportPayload({[s.id]:s})));
  ok(res.ok,res.errore);
  const r=res.sessions[0];
  eq(r.batteria.length,8);
  eq(r.somministrazioni["lista-appr"].classif,"deficit");
  eq(r.somministrazioni["fluenza-sem"].stato,"non-interpretabile");
  eq(r.validita.valori.vista,3);
  eq(r.profilo.override["velocita"].giudizio,"borderline");
  eq(r.referto.versioni.length,1);
});
t("import: rifiuta file estranei e ripulisce valori corrotti",()=>{
  ok(!L.parseImport("{x").ok);
  ok(!L.parseImport('{"app":"altro","sessioni":[]}').ok);
  const raw={code:"QA-C",schema:2,batteria:["mmse","inesistente"],
    somministrazioni:{mmse:{stato:"INVENTATO",classif:"boh",grezzo:"27"}},
    validita:{valori:{vista:99}},
    secondLevel:{items:[{id:"amnestico",esito:"x",incluso:1},{id:"ignoto"}]}};
  const s=L.sanitizeSession(raw);
  eq(s.batteria,["mmse"]);
  eq(s.somministrazioni["mmse"].stato,"da-fare");
  eq(s.somministrazioni["mmse"].classif,"na");
  eq(s.somministrazioni["mmse"].grezzo,"27");
  eq(s.validita.valori.vista,undefined);
  eq(s.secondLevel.items.length,1);
  eq(s.secondLevel.items[0].esito,"na");
});
t("migrazione dal vecchio formato (v1→v2): giudizi conservati come override",()=>{
  const vecchia={id:"sold1",code:"NP-OLD",createdAt:"2026-07-01T00:00:00Z",updatedAt:"2026-07-01T00:00:00Z",
    meta:{dataValutazione:"2026-07-01",esaminatore:"Dott. X",etaAnni:"80",scolaritaAnni:"5",lateralita:"destrimane",motivo:"controllo",anamnesi:"nota"},
    firstLevel:{domains:{memoria:{rating:"deficit",strumento:"",punteggio:"",note:"richiamo povero"},attenzione:{rating:"norma",strumento:"",punteggio:"",note:""},orientamento:{rating:"na"}},osservazioni:"collaborante"},
    classification:{confermataAt:"2026-07-01T00:00:00Z",basata:"x",notaClinico:""},
    secondLevel:{basata:"",items:[]},
    report:{conclusioni:"vecchie conclusioni",testoManuale:"",modificatoAt:null}};
  const s=L.sanitizeSession(vecchia);
  ok(s,"migrazione fallita");
  eq(s.schema,2);
  eq(s.code,"NP-OLD");
  eq(s.anagrafica.etaAnni,"80");
  eq(s.quesito.quesitoClinico,"controllo");
  eq(s.profilo.override["mem-verbale"].giudizio,"deficit");
  ok(!s.profilo.override["attenzione"]||s.profilo.override["attenzione"].giudizio!=="deficit");
  eq(s.osservazioni,"collaborante");
  eq(s.referto.conclusioni,"vecchie conclusioni");
  const res=L.parseImport(JSON.stringify({app:"neuroscreen-clinico",formato:1,sessioni:[vecchia]}));
  ok(res.ok,"import formato 1 rifiutato");
});
t("sessione demo: dichiaratamente fittizia e coerente col catalogo",()=>{
  const s=L.demoSession();
  ok(/fittizi/i.test(s.quesito.quesitoClinico)||/dimostrativ/i.test(s.quesito.quesitoClinico));
  s.batteria.forEach(id=>ok(L.TEST_BY_ID[id],"test inesistente in demo: "+id));
  Object.keys(s.somministrazioni).forEach(id=>{
    eq(Object.keys(L.validateSomm(id,s.somministrazioni[id])).length,0,"dati demo non validi per "+id);
  });
  ok(L.proposeModules(s).length>0,"la demo dovrebbe generare proposte");
});

/* ---------- confronto longitudinale ---------- */
function coppiaDemo(){
  const [prima,dopo]=L.demoSessions();
  const sessions={[prima.id]:prima,[dopo.id]:dopo};
  return {prima,dopo,sessions};
}
t("comparabili: stesse persone via codice paziente, ordinate per data",()=>{
  const {prima,dopo,sessions}=coppiaDemo();
  const c=L.comparableSessions(sessions,dopo);
  eq(c.length,1);eq(c[0].id,prima.id);
  const estranea=L.newSession("ALTRO-01");
  sessions[estranea.id]=estranea;
  eq(L.comparableSessions(sessions,dopo).length,1,"sessione di altro paziente inclusa nel confronto");
  eq(L.comparableSessions(sessions,estranea).length,0,"senza codice paziente non deve trovare nulla");
});
t("newFollowUp: copia dati stabili e batteria, codice unico, aggancio al confronto",()=>{
  const {prima,sessions}=coppiaDemo();
  const f=L.newFollowUp(prima,sessions);
  eq(f.anagrafica.codicePaziente,"DEMO-PZ");
  eq(f.anagrafica.scolaritaAnni,prima.anagrafica.scolaritaAnni);
  eq(f.batteria,prima.batteria);
  eq(f.confronto.withId,prima.id);
  ok(f.code!==prima.code&&!Object.values(sessions).some(x=>x.code===f.code),"codice non unico");
  eq(Object.keys(f.somministrazioni).length,0,"i risultati non vanno copiati");
  eq(f.referto.conclusioni,"","le conclusioni non vanno copiate");
});
t("compareSessions: differenze di grezzo/tempo/errori e classificazioni variate",()=>{
  const {prima,dopo}=coppiaDemo();
  const cmp=L.compareSessions(prima,dopo);
  ok(cmp.giorni>=300&&cmp.giorni<=400,"intervallo inatteso: "+cmp.giorni);
  const mmse=cmp.tests.find(t=>t.tid==="mmse");
  eq(mmse.dGrezzo,-2);
  ok(mmse.classifVariata,"borderline→deficit non rilevato");
  const tmt=cmp.tests.find(t=>t.tid==="tmt-a");
  eq(tmt.dTempo,12);
  eq(tmt.dErrori,1);
  const dgt=cmp.tests.find(t=>t.tid==="digit-avanti");
  eq(dgt.dGrezzo,0);ok(!dgt.classifVariata);
  ok(cmp.tests[0].classifVariata,"le prove con classificazione variata devono venire prima");
  ok(cmp.soloPrev.includes("copia-disegni"),"prova completata solo nella baseline deve stare in soloPrev");
  ok(!cmp.tests.some(t=>t.tid==="copia-disegni"),"prova non somministrata al controllo finita tra le confrontabili");
});
t("compareSessions: variazioni dei giudizi di dominio (incl. autonomia e umore/comportamento)",()=>{
  const {prima,dopo}=coppiaDemo();
  const cmp=L.compareSessions(prima,dopo);
  const auto=cmp.domini.find(d=>d.dom==="autonomia");
  ok(auto&&auto.variato,"autonomia borderline→deficit non rilevata");
  const vel=cmp.domini.find(d=>d.dom==="velocita");
  ok(vel&&vel.variato&&vel.curr==="borderline");
});
t("comparisonText: descrittivo, con limiti (pratica/RCI) e senza dichiarazioni di significatività",()=>{
  const {prima,dopo}=coppiaDemo();
  const txt=L.comparisonText(prima,dopo).join("\n");
  ok(txt.includes("intervallo"),"manca l'intervallo");
  ok(txt.includes("Classificazione del clinico variata"),"variazione di classificazione non riportata");
  ok(txt.includes("da valutare clinicamente"));
  ok(/effetto pratica/.test(txt)&&/RCI/.test(txt),"limiti pratica/RCI assenti");
  ok(!/significativ[oa] (miglioramento|peggioramento)|peggioramento significativo|miglioramento significativo/i.test(txt),
    "il testo dichiara significatività");
});
t("referto: sezione 10 compilata dal confronto quando disponibile, placeholder altrimenti",()=>{
  const {prima,dopo,sessions}=coppiaDemo();
  const r=L.buildReport(dopo,[],sessions);
  ok(r.includes("Valutazione precedente: "+prima.code),"sezione 10 senza confronto");
  ok(r.includes("effetto pratica"),"limiti del confronto assenti dal referto");
  dopo.confronto.nota="Lettura clinica di prova.";
  ok(L.buildReport(dopo,[],sessions).includes("Lettura clinica di prova."));
  const r2=L.buildReport(prima,[],sessions);
  ok(r2.includes("Nessun confronto impostato"),"placeholder assente per la baseline");
});
t("sanitize/export: campo confronto e codice paziente sopravvivono al giro",()=>{
  const {dopo}=coppiaDemo();
  dopo.confronto.nota="nota";
  const res=L.parseImport(JSON.stringify(L.exportPayload({[dopo.id]:dopo})));
  ok(res.ok,res.errore);
  eq(res.sessions[0].confronto.withId,dopo.confronto.withId);
  eq(res.sessions[0].confronto.nota,"nota");
  eq(res.sessions[0].anagrafica.codicePaziente,"DEMO-PZ");
});
t("validateAnagrafica: codice paziente con spazi rifiutato, vuoto lecito",()=>{
  ok(L.validateAnagrafica({codicePaziente:"mario rossi"}).codicePaziente);
  eq(L.validateAnagrafica({codicePaziente:""}).codicePaziente,undefined);
  eq(L.validateAnagrafica({codicePaziente:"DEMO-PZ"}).codicePaziente,undefined);
});
t("demoSessions: coppia collegata, fittizia e valida",()=>{
  const {prima,dopo}=coppiaDemo();
  eq(prima.anagrafica.codicePaziente,"DEMO-PZ");
  eq(dopo.anagrafica.codicePaziente,"DEMO-PZ");
  ok(prima.anagrafica.dataValutazione<dopo.anagrafica.dataValutazione);
  ok(/fittizi|dimostrativ/i.test(dopo.quesito.quesitoClinico));
  Object.keys(dopo.somministrazioni).forEach(id=>{
    eq(Object.keys(L.validateSomm(id,dopo.somministrazioni[id])).length,0,"dati demo follow-up non validi per "+id);
  });
});

/* ---------- referto strutturato (iterazione 3) ---------- */
t("referto strutturato: intestazione, prove e domini completi",()=>{
  const {prima,dopo,sessions}=coppiaDemo();
  const r=L.buildStructuredReport(dopo,[],sessions);
  eq(r.app,"neuroscreen-referto");eq(r.formato,1);
  eq(r.codiceValutazione,dopo.code);
  eq(r.codicePaziente,"DEMO-PZ");
  eq(r.prove.length,dopo.batteria.length,"una voce per ogni prova in batteria");
  const mmse=r.prove.find(p=>p.id==="mmse");
  ["sigla","nome","dominio","stato","motivo","grezzo","correttoManuale","correttoDaFonte",
   "classificazioneClinico","tempoSec","errori","autocorrezioni","intrusioni","perseverazioni",
   "versioneProva","note"].forEach(k=>ok(k in mmse,"manca il campo prova: "+k));
  eq(mmse.grezzo,"24");eq(mmse.classificazioneClinico,"deficit");
  ok(r.domini.length>0,"domini assenti");
  const dm=r.domini[0];
  ["id","nome","giudizio","giudizioDelClinico","affidabilita","sintesi","nota"].forEach(k=>ok(k in dm,"manca il campo dominio: "+k));
  ok(Array.isArray(r.osservazioniQualitative));
  ok(Array.isArray(r.secondoLivello));
  ok(typeof r.testoCompleto==="string"&&r.testoCompleto.includes("BOZZA DI REFERTO"));
  ok(/non costituisce diagnosi/i.test(r.avvertenza));
});
t("referto strutturato: confronto valorizzato per il controllo, null per la baseline",()=>{
  const {prima,dopo,sessions}=coppiaDemo();
  dopo.confronto.nota="nota di confronto";
  const r=L.buildStructuredReport(dopo,[],sessions);
  ok(r.confronto,"confronto assente");
  eq(r.confronto.conValutazione,prima.code);
  eq(r.confronto.notaClinico,"nota di confronto");
  ok(r.confronto.testo.join("\n").includes("effetto pratica"),"limiti assenti dal confronto strutturato");
  eq(L.buildStructuredReport(prima,[],sessions).confronto,null);
});
t("referto strutturato: correttoDaFonte solo con pacchetto normativo, con fonte citata",()=>{
  const {dopo,sessions}=coppiaDemo();
  const senza=L.buildStructuredReport(dopo,[],sessions);
  eq(senza.prove.find(p=>p.id==="mmse").correttoDaFonte,null);
  const con=L.buildStructuredReport(dopo,[packFinto],sessions);
  const cf=con.prove.find(p=>p.id==="mmse").correttoDaFonte;
  ok(cf,"correttoDaFonte assente col pacchetto");
  eq(cf.valore,25.5);
  ok(/fittizia/i.test(cf.fonte),"fonte non citata");
});
t("referto strutturato: nessun termine diagnostico automatico",()=>{
  const {dopo,sessions}=coppiaDemo();
  const j=JSON.stringify(L.buildStructuredReport(dopo,[],sessions));
  ok(!/diagnosi di|demenza|alzheimer|deterioramento cognitivo lieve/i.test(j.replace(/non costituisce diagnosi/gi,"")),
    "termini diagnostici nel referto strutturato");
});

/* ---------- versione della prova (iterazione 3) ---------- */
t("versioneProva: sopravvive a sanitize/export e parte vuota",()=>{
  eq(L.newSomm().versioneProva,"");
  const s=L.newSession("QA-V");
  s.batteria=["denominazione"];
  s.somministrazioni["denominazione"]=Object.assign(L.newSomm(),{stato:"completato",classif:"norma",versioneProva:"forma A"});
  const res=L.parseImport(JSON.stringify(L.exportPayload({[s.id]:s})));
  ok(res.ok,res.errore);
  eq(res.sessions[0].somministrazioni["denominazione"].versioneProva,"forma A");
});
t("versioneProva: versioni diverse rilevate nel confronto e assenti se uguali o vuote",()=>{
  const {prima,dopo}=coppiaDemo();
  prima.somministrazioni["mmse"].versioneProva="forma A";
  dopo.somministrazioni["mmse"].versioneProva="forma B";
  prima.somministrazioni["tmt-a"].versioneProva="std";
  dopo.somministrazioni["tmt-a"].versioneProva="std";
  const cmp=L.compareSessions(prima,dopo);
  ok(cmp.tests.find(t=>t.tid==="mmse").versioneDiversa,"forma A vs B non rilevato");
  ok(!cmp.tests.find(t=>t.tid==="tmt-a").versioneDiversa,"versioni uguali segnalate");
  ok(!cmp.tests.find(t=>t.tid==="digit-avanti").versioneDiversa,"versioni vuote segnalate");
  ok(cmp.tests.find(t=>t.tid==="lista-diff")===undefined||!cmp.tests.find(t=>t.tid==="lista-diff").versioneDiversa);
  /* una sola versione indicata: comunque da segnalare */
  dopo.somministrazioni["lista-appr"].versioneProva="forma B";
  const cmp2=L.compareSessions(prima,dopo);
  ok(cmp2.tests.find(t=>t.tid==="lista-appr").versioneDiversa,"versione indicata solo in una valutazione non segnalata");
});
t("versioneProva: avvertenza esplicita nel testo del confronto e nel referto",()=>{
  const {prima,dopo,sessions}=coppiaDemo();
  prima.somministrazioni["mmse"].versioneProva="forma A";
  dopo.somministrazioni["mmse"].versioneProva="forma B";
  const txt=L.comparisonText(prima,dopo).join("\n");
  ok(txt.includes("versioni della prova diverse"),"avvertenza assente dal confronto");
  ok(txt.includes("forma A")&&txt.includes("forma B"),"versioni non citate");
  ok(txt.includes("confronto non attendibile"),"mancata qualifica di non attendibilità");
  ok(L.buildReport(dopo,[],sessions).includes("versioni della prova diverse"),"avvertenza assente dal referto");
});

/* ---------- vincoli sull'HTML ---------- */
t("HTML: nessuna risorsa esterna, nessuna chiamata di rete",()=>{
  ok(!/\bsrc\s*=\s*["']https?:/i.test(html));
  ok(!/\bhref\s*=\s*["']https?:/i.test(html));
  ok(!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/i.test(html));
});
t("HTML: avviso versione dimostrativa e pseudonimizzazione presenti",()=>{
  ok(/non autorizzata per uso clinico reale/i.test(html));
  ok(/codice pseudonimo/i.test(html));
  ok(/cancella tutti i dati/i.test(html.toLowerCase().replace(/\s+/g," "))||/wipe-all/.test(html));
});
t("HTML: viewport mobile, input 16px, PWA collegata",()=>{
  ok(/name="viewport"/.test(html));
  ok(/font-size:\s*16px/.test(html));
  ok(/rel="manifest"/.test(html));
  ok(/serviceWorker/.test(html)&&/location\.protocol/.test(html));
});
t("referto impaginato: tabella punteggi e stampa HTML",()=>{
  ok(/function reportScoresHTML\(/.test(html));
  ok(/<th>Grezzo<\/th><th>Corretto<\/th>/.test(html));
  ok(/printArea"\)\.innerHTML=reportFormattedHTML/.test(html));
  ok(/reportPreview"\);if\(preview\)preview\.innerHTML=reportFormattedHTML/.test(html));
  ok(/function reportNarrativeForLayout\(/.test(html));
  ok(/6\\\. PROVE SOMMINISTRATE E RISULTATI/.test(html));
});
t("strumenti gratuiti: ACE-III e M-ACE con fonte ufficiale",()=>{
  ["ace3","miniace"].forEach(id=>{
    eq(L.TEST_BY_ID[id].licenza,"gratuita-ufficiale");
    ok(L.TEST_GUIDES[id].officialUrl.includes("sydney.edu.au"));
  });
});
t("HTML: comandi dell'iterazione 3 presenti (export referto, avanzamento, apri/chiudi, versione prova)",()=>{
  ok(html.includes('data-action="export-report-txt"'),"manca export TXT");
  ok(html.includes('data-action="export-report-json"'),"manca export strutturato");
  ok(html.includes("som-progress"),"manca l'indicatore di avanzamento");
  ok(html.includes('data-action="cards-open"')&&html.includes('data-action="cards-close"'),"mancano apri/chiudi tutte");
  ok(html.includes('data-field="versioneProva"'),"manca il campo versione della prova");
  ok(/prove-grid\{display:grid/.test(html),"manca la griglia a due colonne per tablet");
});
t("PWA: manifest e service worker coerenti",()=>{
  const man=JSON.parse(fs.readFileSync(path.join(__dirname,"manifest.json"),"utf8"));
  man.icons.forEach(i=>ok(fs.existsSync(path.join(__dirname,i.src)),"icona mancante: "+i.src));
  const sw=fs.readFileSync(path.join(__dirname,"sw.js"),"utf8");
  ok(sw.includes('cache:"no-store"'));
  ok(/cache\.match\("index\.html"\)/.test(sw));
  ok(/"index\.html"/.test(sw.match(/STATICI=\[[^\]]*\]/)[0]),"index.html non precaricata dal service worker");
});

console.log("");
if(failed){console.error("QA: "+failed+" test falliti, "+passed+" superati.");process.exit(1);}
console.log("QA: tutti i "+passed+" test superati.");
