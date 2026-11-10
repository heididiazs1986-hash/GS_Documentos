/* GS Suite: solo guarda el portal (tarjetas y direcciones). Nunca guarda datos de las apps. */
const CACHE='gs-suite-v2';
const CORE=['./','./index.html','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./applus-logo.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url); if(u.origin!==location.origin||!u.pathname.startsWith('/suite/'))return;
  e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{});return res}).catch(()=>caches.match(r).then(x=>x||caches.match('./index.html'))));
});
