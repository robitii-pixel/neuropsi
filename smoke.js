/* Smoke test end-to-end di NeuroScreen Clinico su 3 viewport
   (desktop, tablet, smartphone). Strumento di sviluppo OPZIONALE:
   l'app non ha dipendenze; questo test richiede playwright-core e un
   Chromium in /opt/pw-browsers (o adattare EXE al proprio percorso).
   Uso: npm run smoke */
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

    ok(await page.title()==="NeuroScreen Clinico — prototipo","titolo pagina");
    ok(await page.locator("#newCode").isVisible(),"home: campo nuova sessione visibile");

    // validazione codice
    await page.fill("#newCode","nome cognome");
    await page.click('button[data-action="new-session"]');
    ok((await page.locator("#newCodeErr").textContent()).includes("Codice non valido"),"codice con spazi rifiutato");

    // crea sessione
    await page.fill("#newCode","NP-2026-001");
    await page.click('button[data-action="new-session"]');
    ok(await page.locator("#f_code").isVisible(),"passo 1 aperto dopo creazione");

    // meta con errore di validazione
    await page.fill("#f_etaAnni","130");
    await page.click('button[data-action="goto-validated"]');
    ok(await page.locator(".field-err").count()>0,"età 130 bloccata con messaggio");
    await page.fill("#f_etaAnni","74");
    await page.fill("#f_scolaritaAnni","8");
    await page.fill("#f_motivo","Prova di percorso completo.");
    await page.click('button[data-action="goto-validated"]');
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 2")),"passo 2 raggiunto");

    // stepper: passo 3 bloccato senza valutazioni
    await page.click('.step[data-view="classificazione"]',{force:true});
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 2")),"passo 3 bloccato senza domini valutati");

    // valuta domini
    await page.click('button[data-action="rate"][data-dom="memoria"][data-val="deficit"]');
    await page.click('button[data-action="rate"][data-dom="esecutive"][data-val="deficit"]');
    await page.click('button[data-action="rate"][data-dom="attenzione"][data-val="borderline"]');
    await page.click('button[data-action="rate"][data-dom="linguaggio"][data-val="norma"]');
    await page.click('.step[data-view="classificazione"]');
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 3")),"passo 3 raggiunto");
    ok((await page.textContent("main")).includes("prestazione deficitaria in: memoria episodica"),"classificazione descrittiva presente");

    // passo 4 bloccato prima della conferma
    await page.click('.step[data-view="secondo"]',{force:true});
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 3")),"passo 4 bloccato prima della conferma");
    await page.click('button[data-action="confirm-classification"]');
    ok(await page.locator("h3").first().textContent().then(t=>t.includes("Passo 4")),"conferma porta al passo 4");
    const nProp=await page.locator(".mod-item").count();
    ok(nProp>=4,"proposte generate ("+nProp+")");
    ok((await page.textContent("main")).includes("Autonomie funzionali"),"autonomie proposte con 2 deficit");

    // il clinico esclude una proposta e aggiunge un modulo
    await page.click('input[data-action="toggle-mod"][data-id="mem-visiva"]');
    await page.selectOption("#addMod","umore-colloquio");
    await page.click('button[data-action="add-mod"]');
    ok((await page.textContent("main")).includes("aggiunto dal clinico"),"modulo manuale aggiunto");
    await page.selectOption("#es_mem-verbale","deficit");
    await page.fill("#str_mem-verbale","strumento a scelta del clinico");

    // referto
    await page.click('.step[data-view="referto"]');
    const rep=await page.inputValue("#reportText");
    ok(rep.includes("BOZZA DI REFERTO"),"referto generato");
    ok(rep.includes("Memoria episodica verbale: deficit"),"esito secondo livello nel referto");
    ok(!rep.includes("Memoria episodica visuo-spaziale"),"modulo escluso assente dal referto");
    ok(rep.includes("Non costituisce diagnosi")||rep.includes("non costituisce diagnosi"),"avvertenza non diagnostica");

    // persistenza: ricarica la pagina
    await page.reload();
    ok((await page.textContent("main")).includes("NP-2026-001"),"sessione presente dopo reload");
    await page.click('button[data-action="open"]');
    ok(await page.inputValue("#f_etaAnni")==="74","dati meta persistiti");
    await page.click('.step[data-view="secondo"]');
    ok(!(await page.isChecked("#inc_mem-visiva")),"esclusione del clinico persistita");

    // overflow orizzontale
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(overflow<=0,"nessuno scroll orizzontale (overflow="+overflow+"px)");

    // tocco minimo 44px sui controlli principali (solo mobile)
    if(vp.name==="smartphone"){
      const small=await page.evaluate(()=>[...document.querySelectorAll("button")].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<44).map(b=>b.textContent.trim().slice(0,20)));
      ok(small.length===0,"tutti i pulsanti >=44px "+(small.length?JSON.stringify(small):""));
    }

    await page.screenshot({path:OUT+"/ns-"+vp.name+".png",fullPage:false});
    ok(errors.length===0,"nessun errore console/pagina"+(errors.length?": "+errors.join(" | "):""));

    // pulizia localStorage per il viewport successivo (context separati: non serve, ma esplicito)
    await ctx.close();
  }
  await browser.close();
  console.log(failures?("\nSMOKE: "+failures+" verifiche fallite"):"\nSMOKE: tutte le verifiche superate");
  process.exit(failures?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
