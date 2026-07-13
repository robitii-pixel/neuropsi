/* Smoke test end-to-end di NeuroScreen (formazione + registro accessorio)
   su 3 viewport (desktop, tablet, smartphone). Strumento di sviluppo
   OPZIONALE: l'app non ha dipendenze; questo test richiede
   playwright-core e un Chromium in /opt/pw-browsers (o adattare EXE).
   Uso: node smoke.js */
const {chromium}=require("playwright-core");
const fs=require("fs");
const EXE=fs.readdirSync("/opt/pw-browsers").filter(d=>/^chromium-\d+$/.test(d)).map(d=>`/opt/pw-browsers/${d}/chrome-linux/chrome`).find(p=>fs.existsSync(p));
const URL="file://"+require("path").join(__dirname,"index.html");
const OUT=require("os").tmpdir();
const VIEWPORTS=[
  {name:"desktop",width:1280,height:800},
  {name:"tablet",width:820,height:1180},
  {name:"smartphone",width:390,height:844}
];
(async()=>{
  const browser=await chromium.launch({executablePath:EXE});
  let failures=0;
  const ok=(c,m)=>{if(c)console.log("  ok  "+m);else{failures++;console.error("  FAIL "+m);}};
  for(const vp of VIEWPORTS){
    console.log("== "+vp.name+" "+vp.width+"x"+vp.height+" ==");
    const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.name!=="desktop"});
    const page=await ctx.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push("pageerror: "+e.message));
    page.on("console",m=>{if(m.type()==="error")errors.push("console: "+m.text());});
    await page.goto(URL);

    ok(await page.title()==="NeuroScreen — orientamento e formazione","titolo pagina");
    ok((await page.textContent("body")).includes("non un test neuropsicologico"),"avviso di uso didattico");

    // percorso formativo separato dal registro
    await page.click('button[data-view="formazione"]');
    ok((await page.textContent("main")).includes("Orientamento alla valutazione neuropsicologica"),"percorso formativo aperto");
    await page.click('button[data-action="training-path"][data-id="linguaggio"]');
    ok((await page.textContent("main")).includes("Difficoltà linguistiche"),"mappa linguaggio selezionata");
    await page.click('button[data-action="admin-start"][data-id="fluenza-fon"]');
    await page.click('button[data-action="admin-count"][data-id="fluenza-fon"][data-kind="v"]');
    await page.click('button[data-action="admin-stop"][data-id="fluenza-fon"]');
    ok((await page.textContent("main")).includes("Dato non clinico"),"esercitazione marcata come non clinica");
    await page.click('button[data-view="home"]');

    // validazione codice
    await page.fill("#newCode","nome cognome");
    await page.click('button[data-action="new-session"]');
    ok((await page.locator("#newCodeErr").textContent()).includes("Codice non valido"),"codice con spazi rifiutato");

    // passo 1: sessione e quesito
    await page.fill("#newCode","NP-2026-001");
    await page.click('button[data-action="new-session"]');
    ok(await page.locator("#f_code").isVisible(),"passo 1 aperto");
    await page.fill('[data-bind="anagrafica.etaAnni"]',"130");
    await page.click('button[data-action="goto-validated"]');
    ok(await page.locator(".field-err").count()>0,"età 130 bloccata");
    await page.fill('[data-bind="anagrafica.etaAnni"]',"74");
    await page.fill('[data-bind="anagrafica.scolaritaAnni"]',"8");
    await page.fill("#f_quesito","Percorso di prova.");
    await page.click('button[data-action="goto-validated"]');
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 2")),"passo 2 (validità) raggiunto");

    // passo 2: validità con un fattore interferente
    await page.selectOption("#v_vista","3");
    await page.click('.step[data-view="batteria"]');

    // passo 3: batteria
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 3")),"passo 3 (batteria) raggiunto");
    await page.click('.step[data-view="prove"]',{force:true});
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 3")),"passo 4 bloccato con batteria vuota");
    await page.click('button[data-action="battery-base"]');
    const nSel=Number(await page.textContent("#batCount"));
    ok(nSel>=15,"batteria di base selezionata ("+nSel+" prove)");
    await page.click('input[data-battery="mmse"]'); // toglie MMSE
    ok(Number(await page.textContent("#batCount"))===nSel-1,"deselezione aggiorna il contatore");
    await page.click('input[data-battery="mmse"]'); // lo rimette
    await page.click('button.primary[data-action="goto-validated"][data-view="prove"]');

    // passo 4: somministrazione
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 4")),"passo 4 (somministrazione) raggiunto");
    const ensureOpen=async tid=>page.evaluate(id=>{const d=document.querySelector("#card_"+id);if(d&&!d.open)d.open=true;},tid);
    const setStato=async(tid,val)=>{await ensureOpen(tid);await page.click(`button[data-action="som-stato"][data-id="${tid}"][data-val="${val}"]`);};
    const fill=async(tid,f,v)=>page.fill(`[data-som="${tid}"][data-field="${f}"]`,v);
    const selCl=async(tid,v)=>page.selectOption(`#s_${tid}_cl`,v);
    const fieldVal=async(tid,f)=>page.inputValue(`[data-som="${tid}"][data-field="${f}"]`);
    page.on("dialog",d=>d.accept());

    await setStato("mmse","completato");
    await fill("mmse","grezzo","31");
    // l'errore di range compare al re-render (cambio stato di un'altra prova)
    await setStato("orientamento","completato");
    ok((await page.textContent("main")).includes("Fuori dall'intervallo del test (0–30)"),"grezzo 31 su MMSE segnalato fuori range");
    await fill("mmse","grezzo","26");
    await selCl("mmse","borderline");
    await selCl("orientamento","norma");
    // cronometro
    await ensureOpen("tmt-a");
    await page.click('button[data-action="timer-start"][data-id="tmt-a"]');
    await page.waitForTimeout(1200);
    await page.click('button[data-action="timer-pause"][data-id="tmt-a"]');
    const tempoTmt=await page.inputValue('[data-som="tmt-a"][data-field="tempoSec"]');
    ok(Number(tempoTmt)>=1,"cronometro scrive il tempo ("+tempoTmt+"s)");
    await setStato("tmt-a","completato");
    await selCl("tmt-a","norma");
    // memoria: pattern richiamo giù / riconoscimento ok
    await setStato("lista-appr","completato");
    await fill("lista-appr","grezzo","28");await fill("lista-appr","intrusioni","2");
    await selCl("lista-appr","deficit");
    await setStato("lista-diff","completato");
    await fill("lista-diff","grezzo","2");await selCl("lista-diff","deficit");
    await setStato("lista-ric","completato");
    await fill("lista-ric","grezzo","13");await selCl("lista-ric","norma");
    // fluenze giù, denominazione ok
    await setStato("fluenza-fon","completato");
    await fill("fluenza-fon","grezzo","18");await fill("fluenza-fon","perseverazioni","3");
    await selCl("fluenza-fon","deficit");
    await setStato("denominazione","completato");
    await fill("denominazione","grezzo","48");await selCl("denominazione","norma");
    // non interpretabile con motivo obbligatorio
    await setStato("fluenza-sem","non-interpretabile");
    await page.fill('#s_fluenza-sem_motivo',"prova interrotta");
    // autonomia ridotta
    await setStato("iadl","completato");
    await fill("iadl","grezzo","3");await selCl("iadl","deficit");
    // messaggio norme non integrate visibile
    ok((await page.textContent("main")).includes("Norme non integrate"),"messaggio norme non integrate presente");
    // avanzamento, apri/chiudi tutte, versione della prova
    ok((await page.textContent("#som-progress")).includes("Registrate"),"indicatore di avanzamento presente");
    await page.click('button[data-action="cards-close"]');
    ok(await page.evaluate(()=>[...document.querySelectorAll("details.test-card")].every(d=>!d.open)),"chiudi tutte funziona");
    await page.click('button[data-action="cards-open"]');
    ok(await page.evaluate(()=>[...document.querySelectorAll("details.test-card")].every(d=>d.open)),"apri tutte funziona");
    await fill("mmse","versioneProva","forma A");
    await page.fill("#f_oss","Collaborante. Prova.");

    // passo 5: profilo
    await page.click('.step[data-view="profilo"]');
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 5")),"passo 5 (profilo) raggiunto");
    const mainTx=await page.textContent("main");
    ok(mainTx.includes("Memoria episodica verbale"),"dominio memoria verbale nel profilo");
    ok(/affidabilità/i.test(mainTx),"affidabilità mostrata");
    // override del clinico su un dominio
    await page.selectOption("#ov_velocita","borderline");
    await page.fill("#ovn_velocita","rallentamento ai limiti");
    // secondo livello bloccato prima della conferma
    await page.click('.step[data-view="secondo"]',{force:true});
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 5")),"passo 6 bloccato prima della conferma");
    await page.click('button[data-action="confirm-profile"]');

    // passo 6: approfondimenti
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 6")),"conferma porta al passo 6");
    const props=await page.locator(".mod-item").count();
    ok(props>=4,"proposte generate ("+props+")");
    const secondoTx=await page.textContent("main");
    ok(secondoTx.includes("riconoscimento relativamente conservato")||secondoTx.includes("Strategie di recupero"),"regola richiamo/riconoscimento attiva");
    ok(secondoTx.includes("denominazione conservata"),"regola fluenze/denominazione attiva");
    ok(secondoTx.includes("Perché:"),"motivazioni visibili");
    await page.click('input[data-action="toggle-mod"][data-id="validita"]');
    await page.selectOption("#addMod","umore");
    await page.click('button[data-action="add-mod"]');
    ok((await page.textContent("main")).includes("aggiunto dal clinico"),"modulo manuale aggiunto");
    await page.selectOption("#es_amnestico","deficit");

    // passo 7: referto
    await page.click('.step[data-view="referto"]');
    await page.fill('[data-bind="referto.conclusioni"]',"Conclusioni di prova del clinico.");
    const rep=await page.inputValue("#reportText");
    ok(rep.includes("BOZZA DI REFERTO"),"referto generato");
    ok(rep.includes("6. PROVE SOMMINISTRATE"),"tabella risultati presente");
    ok(rep.includes("non interpretabile"),"stato NI nel referto");
    ok(rep.includes("beneficio relativo dal riconoscimento"),"frase qualitativa da regola");
    ok(rep.includes("giudizio del clinico"),"override citato nel referto");
    ok(rep.includes("Non costituisce diagnosi"),"avvertenza non diagnostica");
    // versionamento
    await page.click('button[data-action="save-version"]');
    ok((await page.textContent("main")).includes("Versione 1"),"versione salvata ed elencata");
    // esportazioni del referto (TXT e JSON strutturato)
    const dTxt=page.waitForEvent("download");
    await page.click('button[data-action="export-report-txt"]');
    ok((await dTxt).suggestedFilename().endsWith(".txt"),"download TXT del referto");
    const dJson=page.waitForEvent("download");
    await page.click('button[data-action="export-report-json"]');
    const fJson=await dJson;
    ok(fJson.suggestedFilename().startsWith("referto-strutturato-"),"download JSON strutturato");
    const jPath=await fJson.path();
    const jObj=JSON.parse(fs.readFileSync(jPath,"utf8"));
    ok(jObj.app==="neuroscreen-referto"&&Array.isArray(jObj.prove)&&jObj.prove.some(p=>p.id==="mmse"&&p.versioneProva==="forma A"),
      "contenuto del referto strutturato coerente (con versione prova)");

    // persistenza: ricarica
    await page.reload();
    ok((await page.textContent("main")).includes("NP-2026-001"),"sessione presente dopo reload");
    await page.click('button[data-action="open"]');
    ok(await page.inputValue('[data-bind="anagrafica.etaAnni"]')==="74","anagrafica persistita");
    await page.click('.step[data-view="prove"]');
    ok(await page.inputValue('[data-som="mmse"][data-field="grezzo"]')==="26","punteggi persistiti");
    await page.click('.step[data-view="secondo"]');
    ok(!(await page.isChecked("#inc_validita")),"esclusione del clinico persistita");
    ok(await page.locator("#es_amnestico").inputValue()==="deficit","esito approfondimento persistito");

    // confronto longitudinale con la coppia dimostrativa
    await page.click('.step[data-view="referto"]');
    await page.click('button[data-action="goto"][data-view="home"]');
    await page.click('button[data-action="new-demo"]');
    ok((await page.textContent("#topSess")).includes("DEMO-PZ-2"),"coppia demo creata, aperto il controllo");
    await page.click('.step[data-view="confronto"]');
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 7")),"passo 7 (confronto) raggiunto");
    const cmpTx=await page.textContent("main");
    ok(cmpTx.includes("Prove confrontabili"),"tabella confronto presente");
    ok(cmpTx.includes("(-2)"),"delta del grezzo MMSE mostrato");
    ok(cmpTx.includes("variata"),"classificazione variata evidenziata");
    ok(cmpTx.includes("effetto pratica")&&cmpTx.includes("RCI"),"limiti del confronto mostrati");
    ok(cmpTx.includes("Solo nella valutazione precedente"),"prove non ripetute segnalate");
    await page.fill('[data-bind="confronto.nota"]',"Lettura clinica del confronto (prova).");
    await page.click('.step[data-view="referto"]');
    const rep2=await page.inputValue("#reportText");
    ok(rep2.includes("Valutazione precedente: DEMO-001"),"sezione 10 dal confronto");
    ok(rep2.includes("Lettura clinica del confronto (prova)."),"nota del clinico nel referto");
    ok(rep2.includes("effetto pratica"),"limiti nel referto");

    // overflow orizzontale e tocchi
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(overflow<=0,"nessuno scroll orizzontale (overflow="+overflow+"px)");
    if(vp.name!=="desktop"){
      const small=await page.evaluate(()=>[...document.querySelectorAll("button")].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<44).map(b=>b.textContent.trim().slice(0,20)));
      ok(small.length===0,"tutti i pulsanti >=44px "+(small.length?JSON.stringify(small):""));
    }
    await page.screenshot({path:OUT+"/ns-"+vp.name+".png",fullPage:false});
    ok(errors.length===0,"nessun errore console/pagina"+(errors.length?": "+errors.join(" | "):""));
    await ctx.close();
  }
  await browser.close();
  console.log(failures?("\nSMOKE: "+failures+" verifiche fallite"):"\nSMOKE: tutte le verifiche superate");
  process.exit(failures?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
