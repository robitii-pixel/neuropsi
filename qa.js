#!/usr/bin/env node
/* Suite QA di NeuroScreen Clinico.
   Estrae il blocco di logica pura da index.html (marcatori NS-LOGIC) e
   verifica classificazione, selezione moduli, referto, validazioni e import.
   Nessuna dipendenza esterna. Uso: npm run check */
"use strict";
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const m=html.match(/\/\*NS-LOGIC-START\*\/([\s\S]*?)\/\*NS-LOGIC-END\*\//);
if(!m){console.error("FATALE: marcatori NS-LOGIC non trovati in index.html");process.exit(1);}
const ctx={console};
vm.createContext(ctx);
/* nel vm le const non finiscono sul global: esportiamo i simboli in coda */
const EXPORTS=["APPV","LS_KEY","RATINGS","RATING_LABEL","DOMAINS","DOMAIN_BY_ID","MODULES","MODULE_BY_ID",
  "TEST_REGISTRY","applyNorms","newSession","validateCode","validateMeta","classify","proposeModules",
  "mergeSecondLevel","fmtDateIT","buildReport","exportPayload","sanitizeSession","parseImport","nowISO","uid"];
try{
  vm.runInContext(m[1]+"\n;this.__NS={"+EXPORTS.join(",")+"};",ctx,{filename:"index.html <logica>"});
}catch(e){
  console.error("FATALE: il blocco di logica non si esegue:",e.message);process.exit(1);
}
const L=ctx.__NS; // logica

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

console.log("QA NeuroScreen Clinico — "+L.APPV);

/* ---- struttura di base ---- */
t("8 domini definiti, id unici",()=>{
  eq(L.DOMAINS.length,8);
  eq(new Set(L.DOMAINS.map(d=>d.id)).size,8);
});
t("catalogo moduli: id unici e domini esistenti",()=>{
  eq(new Set(L.MODULES.map(m=>m.id)).size,L.MODULES.length);
  L.MODULES.forEach(mod=>mod.dom.forEach(d=>ok(L.DOMAIN_BY_ID[d],"dominio inesistente: "+d)));
});
t("registro test validati vuoto e norme non applicabili (per scelta)",()=>{
  eq(L.TEST_REGISTRY.length,0);
  const r=L.applyNorms("x",10,70,8);
  eq(r.disponibile,false);
  ok(r.motivo.length>10);
});
t("nessuna diagnosi automatica nei testi di classificazione",()=>{
  const s=L.newSession("QA-1");
  s.firstLevel.domains.memoria.rating="deficit";
  s.firstLevel.domains.esecutive.rating="deficit";
  const c=L.classify(s.firstLevel);
  const banned=/demenza|alzheimer|diagnosi di|mci|deterioramento cognitivo lieve/i;
  ok(!banned.test(c.testo),"testo classificazione contiene termini diagnostici");
  ok(!banned.test(L.buildReport(s)),"referto contiene termini diagnostici");
});

/* ---- newSession ---- */
t("newSession: tutti i domini partono non valutati",()=>{
  const s=L.newSession("QA-2");
  L.DOMAINS.forEach(d=>eq(s.firstLevel.domains[d.id].rating,"na"));
  eq(s.secondLevel.items.length,0);
  ok(!s.classification.confermataAt);
});

/* ---- validazioni ---- */
t("validateCode: rifiuta vuoto, spazi, caratteri strani; accetta codici sensati",()=>{
  ok(L.validateCode(""),"vuoto accettato");
  ok(L.validateCode("mario rossi"),"spazi accettati");
  ok(L.validateCode("a"),"1 carattere accettato");
  ok(L.validateCode("x".repeat(25)),"25 caratteri accettati");
  ok(L.validateCode("cod!ce"),"punteggiatura accettata");
  eq(L.validateCode("NP-2026-014"),null);
  eq(L.validateCode("caso_07.b"),null);
});
t("validateCode: segnala duplicati (case-insensitive) ma non se stesso",()=>{
  const a=L.newSession("NP-01");
  const sessions={[a.id]:a};
  ok(L.validateCode("np-01",sessions,null),"duplicato non rilevato");
  eq(L.validateCode("np-01",sessions,a.id),null,"la sessione vede se stessa come duplicato");
});
t("validateMeta: età e scolarità fuori range, data futura",()=>{
  const meta={etaAnni:"130",scolaritaAnni:"31",dataValutazione:"2099-01-01",esaminatore:"",lateralita:"",motivo:"",anamnesi:""};
  const e=L.validateMeta(meta);
  ok(e.etaAnni,"età 130 accettata");
  ok(e.scolaritaAnni,"scolarità 31 accettata");
  ok(e.dataValutazione,"data futura accettata");
  eq(Object.keys(L.validateMeta({etaAnni:"75",scolaritaAnni:"8",dataValutazione:"2026-07-01"})).length,0);
  eq(Object.keys(L.validateMeta({etaAnni:"",scolaritaAnni:"",dataValutazione:""})).length,0,"campi vuoti devono essere leciti");
  ok(L.validateMeta({etaAnni:"70.5"}).etaAnni,"età non intera accettata");
});

/* ---- classificazione ---- */
t("classify: profilo vuoto",()=>{
  const s=L.newSession("QA-3");
  const c=L.classify(s.firstLevel);
  eq(c.valutati,0);eq(c.deficits.length,0);
  ok(/Nessun dominio/.test(c.testo));
});
t("classify: separa deficit, borderline, norma, non valutati",()=>{
  const s=L.newSession("QA-4");
  s.firstLevel.domains.memoria.rating="deficit";
  s.firstLevel.domains.attenzione.rating="borderline";
  s.firstLevel.domains.linguaggio.rating="norma";
  const c=L.classify(s.firstLevel);
  eq(c.deficits,["memoria"]);
  eq(c.borderlines,["attenzione"]);
  eq(c.norma,["linguaggio"]);
  eq(c.valutati,3);
  eq(c.nonValutati.length,5);
  ok(c.warnings.some(w=>/non ancora valutati/i.test(w)),"manca avviso di valutazione parziale");
});
t("classify: avvertenza con orientamento deficitario",()=>{
  const s=L.newSession("QA-5");
  s.firstLevel.domains.orientamento.rating="deficit";
  ok(L.classify(s.firstLevel).warnings.some(w=>/cautela/i.test(w)));
});
t("classify: hash cambia al cambiare dei giudizi",()=>{
  const s=L.newSession("QA-6");
  const h1=L.classify(s.firstLevel).hash;
  s.firstLevel.domains.memoria.rating="deficit";
  ok(h1!==L.classify(s.firstLevel).hash);
});

/* ---- selezione adattiva ---- */
t("proposeModules: nessuna proposta se tutto nella norma",()=>{
  const s=L.newSession("QA-7");
  L.DOMAINS.forEach(d=>s.firstLevel.domains[d.id].rating="norma");
  eq(L.proposeModules(L.classify(s.firstLevel)).length,0);
});
t("proposeModules: deficit di memoria propone i moduli di memoria con priorità alta",()=>{
  const s=L.newSession("QA-8");
  s.firstLevel.domains.memoria.rating="deficit";
  const p=L.proposeModules(L.classify(s.firstLevel));
  const ids=p.map(x=>x.id);
  ok(ids.includes("mem-verbale"),"manca memoria verbale");
  ok(ids.includes("mem-visiva"),"manca memoria visiva");
  eq(p.find(x=>x.id==="mem-verbale").priorita,"alta");
  ok(p.every(x=>x.motivi.length>0),"proposte senza motivazione");
});
t("proposeModules: borderline produce priorità media",()=>{
  const s=L.newSession("QA-9");
  s.firstLevel.domains.linguaggio.rating="borderline";
  const p=L.proposeModules(L.classify(s.firstLevel));
  eq(p.find(x=>x.id==="ling-denominazione").priorita,"media");
});
t("proposeModules: moduli multi-dominio sommano gli indizi",()=>{
  const s=L.newSession("QA-10");
  s.firstLevel.domains.attenzione.rating="borderline";
  s.firstLevel.domains.esecutive.rating="borderline";
  const p=L.proposeModules(L.classify(s.firstLevel));
  const ml=p.find(x=>x.id==="mem-lavoro");
  ok(ml,"memoria di lavoro non proposta");
  eq(ml.priorita,"alta","due borderline convergenti devono dare priorità alta");
  eq(ml.motivi.length,2);
});
t("proposeModules: con >=2 deficit propone le autonomie funzionali",()=>{
  const s=L.newSession("QA-11");
  s.firstLevel.domains.memoria.rating="deficit";
  s.firstLevel.domains.esecutive.rating="deficit";
  const p=L.proposeModules(L.classify(s.firstLevel));
  ok(p.some(x=>x.id==="autonomie"));
  const s2=L.newSession("QA-11b");
  s2.firstLevel.domains.memoria.rating="deficit";
  ok(!L.proposeModules(L.classify(s2.firstLevel)).some(x=>x.id==="autonomie"),"autonomie proposte con un solo deficit");
});
t("proposeModules: ordinate per punteggio decrescente",()=>{
  const s=L.newSession("QA-12");
  s.firstLevel.domains.memoria.rating="deficit";
  s.firstLevel.domains.linguaggio.rating="borderline";
  const p=L.proposeModules(L.classify(s.firstLevel));
  for(let i=1;i<p.length;i++)ok(p[i-1].score>=p[i].score,"ordine errato");
});

/* ---- fusione decisioni del clinico ---- */
t("mergeSecondLevel: conserva esclusioni ed esiti sulle proposte confermate",()=>{
  const s=L.newSession("QA-13");
  s.firstLevel.domains.memoria.rating="deficit";
  const p1=L.proposeModules(L.classify(s.firstLevel));
  let items=L.mergeSecondLevel({items:[]},p1);
  items.find(i=>i.id==="mem-visiva").incluso=false;
  items.find(i=>i.id==="mem-verbale").esito="deficit";
  items.find(i=>i.id==="mem-verbale").note="rievocazione differita carente";
  const items2=L.mergeSecondLevel({items},p1);
  eq(items2.find(i=>i.id==="mem-visiva").incluso,false,"esclusione persa");
  eq(items2.find(i=>i.id==="mem-verbale").esito,"deficit","esito perso");
  eq(items2.find(i=>i.id==="mem-verbale").note,"rievocazione differita carente","nota persa");
});
t("mergeSecondLevel: conserva i moduli aggiunti a mano",()=>{
  const s=L.newSession("QA-14");
  s.firstLevel.domains.memoria.rating="deficit";
  const p=L.proposeModules(L.classify(s.firstLevel));
  const items=L.mergeSecondLevel({items:[{id:"umore-colloquio",origine:"manuale",priorita:"media",motivi:[],incluso:true,esito:"na",strumento:"",note:""}]},p);
  ok(items.some(i=>i.id==="umore-colloquio"&&i.origine==="manuale"));
});
t("mergeSecondLevel: modulo compilato non più proposto resta segnalato; quello intatto sparisce",()=>{
  const s=L.newSession("QA-15");
  s.firstLevel.domains.memoria.rating="deficit";
  const p1=L.proposeModules(L.classify(s.firstLevel));
  let items=L.mergeSecondLevel({items:[]},p1);
  items.find(i=>i.id==="mem-verbale").esito="borderline";
  items.find(i=>i.id==="mem-visiva").incluso=false; // non toccato in altro modo
  // il primo livello torna nella norma → nessuna proposta
  s.firstLevel.domains.memoria.rating="norma";
  const p2=L.proposeModules(L.classify(s.firstLevel));
  const items2=L.mergeSecondLevel({items},p2);
  const verb=items2.find(i=>i.id==="mem-verbale");
  ok(verb,"modulo con esito compilato è sparito");
  eq(verb.origine,"proposta-precedente");
  ok(!items2.some(i=>i.id==="mem-visiva"),"modulo escluso e mai compilato doveva sparire");
});

/* ---- referto ---- */
t("buildReport: contiene intestazione, sezioni e avvertenza non diagnostica",()=>{
  const s=L.newSession("QA-16");
  s.meta.etaAnni="74";s.meta.scolaritaAnni="8";s.meta.motivo="Riferite difficoltà di memoria.";
  s.firstLevel.domains.memoria.rating="deficit";
  s.firstLevel.domains.memoria.strumento="test di screening scelto dal clinico";
  s.firstLevel.domains.memoria.punteggio="12";
  const r=L.buildReport(s);
  ["BOZZA DI REFERTO","Codice pseudonimo: QA-16","PRIMO LIVELLO","CLASSIFICAZIONE PRELIMINARE","SECONDO LIVELLO","CONCLUSIONI","Non costituisce diagnosi"]
    .forEach(x=>ok(r.includes(x),"manca: "+x));
  ok(r.includes("punteggio grezzo: 12"));
  ok(r.includes("[da completare a cura del clinico]"),"conclusioni vuote non segnalate");
});
t("buildReport: include esiti del secondo livello solo per moduli inclusi",()=>{
  const s=L.newSession("QA-17");
  s.firstLevel.domains.memoria.rating="deficit";
  const items=L.mergeSecondLevel({items:[]},L.proposeModules(L.classify(s.firstLevel)));
  items.find(i=>i.id==="mem-verbale").esito="deficit";
  items.find(i=>i.id==="mem-visiva").incluso=false;
  s.secondLevel.items=items;
  const r=L.buildReport(s);
  ok(r.includes("Memoria episodica verbale: deficit"));
  ok(!r.includes("Memoria episodica visuo-spaziale"),"modulo escluso finito nel referto");
});
t("fmtDateIT",()=>{
  eq(L.fmtDateIT("2026-07-12"),"12/07/2026");
  eq(L.fmtDateIT(""),"");
});

/* ---- import/export ---- */
t("export→import: giro completo senza perdite",()=>{
  const s=L.newSession("QA-18");
  s.meta.etaAnni="80";
  s.firstLevel.domains.attenzione.rating="borderline";
  s.classification.notaClinico="nota di prova";
  const payload=L.exportPayload({[s.id]:s});
  const res=L.parseImport(JSON.stringify(payload));
  ok(res.ok,res.errore);
  eq(res.sessions.length,1);
  eq(res.sessions[0].code,"QA-18");
  eq(res.sessions[0].meta.etaAnni,"80");
  eq(res.sessions[0].firstLevel.domains.attenzione.rating,"borderline");
  eq(res.sessions[0].classification.notaClinico,"nota di prova");
});
t("parseImport: rifiuta JSON rotto, file estranei, formati futuri",()=>{
  ok(!L.parseImport("{non json").ok);
  ok(!L.parseImport('{"a":1}').ok);
  ok(!L.parseImport(JSON.stringify({app:"neuroscreen-clinico",formato:99,sessioni:[]})).ok);
  ok(!L.parseImport(JSON.stringify({app:"neuroscreen-clinico",formato:1,sessioni:[{niente:"code"}]})).ok);
});
t("sanitizeSession: scarta valori corrotti mantenendo il resto",()=>{
  const raw={code:"QA-19",firstLevel:{domains:{memoria:{rating:"INVENTATO",note:"ok"},attenzione:{rating:"deficit"}}},
    secondLevel:{items:[{id:"mem-verbale",esito:"boh",incluso:1},null,"x"]}};
  const s=L.sanitizeSession(raw);
  eq(s.firstLevel.domains.memoria.rating,"na","rating inventato non azzerato");
  eq(s.firstLevel.domains.memoria.note,"ok");
  eq(s.firstLevel.domains.attenzione.rating,"deficit");
  eq(s.secondLevel.items.length,1);
  eq(s.secondLevel.items[0].esito,"na");
  eq(s.secondLevel.items[0].incluso,true);
});
t("sanitizeSession: rifiuta oggetti senza codice",()=>{
  eq(L.sanitizeSession({}),null);
  eq(L.sanitizeSession(null),null);
});

/* ---- vincoli sull'interfaccia (controlli statici sull'HTML) ---- */
t("HTML: nessun riferimento a risorse esterne (app locale e offline)",()=>{
  ok(!/\bsrc\s*=\s*["']https?:/i.test(html),"trovato src esterno");
  ok(!/\bhref\s*=\s*["']https?:/i.test(html),"trovato href esterno");
  ok(!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/i.test(html),"trovata chiamata di rete");
});
t("HTML: disclaimer non diagnostico e invito alla pseudonimizzazione presenti",()=>{
  ok(/non produce diagnosi/i.test(html));
  ok(/codice pseudonimo/i.test(html));
});
t("HTML: viewport mobile e input da 16px (anti-zoom iOS)",()=>{
  ok(/name="viewport"/.test(html));
  ok(/font-size:\s*16px/.test(html));
});

console.log("");
if(failed){console.error("QA: "+failed+" test falliti, "+passed+" superati.");process.exit(1);}
console.log("QA: tutti i "+passed+" test superati.");
