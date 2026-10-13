const CACHE='gs-firmas-v1';
const APP=['./','./index.html','./styles.css','./app.js','./manifest.json'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    caches.match(event.request).then(hit=>hit || fetch(event.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
      return res;
    }))
  );
});
