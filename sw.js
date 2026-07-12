/* Service worker di NeuroScreen Clinico.
   Strategia: per la pagina RETE-PRIMA ignorando la cache del browser
   (cache:"no-store", attesa massima 2,5s, fallback sull'ultima versione
   salvata) — mai cache-prima per index.html, altrimenti gli aggiornamenti
   non arrivano. Icone e manifest: cache-prima. */
"use strict";
const CACHE="neuroscreen-sw-v2";
/* index.html va salvata già all'installazione: la prima navigazione avviene
   prima che il service worker prenda il controllo, e senza questa copia
   l'app non si aprirebbe offline dopo una sola visita */
const STATICI=["index.html","manifest.json","icona-192.png","icona-512.png"];

self.addEventListener("install",e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(STATICI).catch(()=>{}))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  const isPagina=req.mode==="navigate"||url.pathname.endsWith("/index.html")||url.pathname.endsWith("/");
  if(isPagina){
    e.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const res=await Promise.race([
          fetch(req,{cache:"no-store"}),
          new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),2500))
        ]);
        if(res&&res.ok){cache.put("index.html",res.clone());return res;}
        throw new Error("risposta non valida");
      }catch(err){
        const salvata=await cache.match("index.html");
        if(salvata)return salvata;
        throw err;
      }
    })());
    return;
  }

  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(req);
    if(hit)return hit;
    const res=await fetch(req);
    if(res&&res.ok)cache.put(req,res.clone());
    return res;
  })());
});
