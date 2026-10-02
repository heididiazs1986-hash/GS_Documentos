const CACHE='gs-docs-v81-field-utility1';
const CORE=['./','./index.html','./manifest.json','./gs-docs-icon-192.png','./gs-docs-icon-512.png','./v77-fix.js','./gs-docs-field-hero.webp','./templates/base64/AR.txt','./templates/base64/DJ.txt','./templates/base64/E6.txt','./templates/base64/EC_APPLUS.txt','./templates/base64/RETIE.txt','./templates/base64/TD.txt','./templates/base64/E1.part01.txt','./templates/base64/E1.part02.txt','./templates/base64/E1.part03.txt','./templates/base64/E1.part04.txt','./templates/base64/E1.part05.txt','./templates/base64/E1.part06.txt','./templates/base64/E1.part07.txt','./templates/base64/E1.part08.txt','./templates/base64/E1.part09.txt','./templates/base64/E1.part10.txt','./templates/base64/E1.part11.txt','./templates/base64/E1.part12.txt','./templates/base64/E1.part13.txt'];
const REMOTE=['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js','https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
const HOTFIX='<script src="./v77-fix.js?v=gsdoc-v81-field-utility1"></script>';

self.addEventListener('install',e=>e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  await c.addAll(CORE);
  await Promise.allSettled(REMOTE.map(async u=>{try{const r=await fetch(u,{mode:'cors'});if(r&&r.ok)await c.put(u,r.clone())}catch(_){}}));
  await self.skipWaiting();
})()));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));

async function pageWithV77(request){
  let response;
  try{response=await fetch(request,{cache:'no-store'});}catch(_){response=await caches.match('./index.html');}
  if(!response)return new Response('Sin conexión',{status:503});
  let html=await response.text();
  if(!html.includes('v77-fix.js'))html=html.replace('</body>',HOTFIX+'\n</body>');
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store');
  headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const isManifest=u.pathname.endsWith('/manifest.json');
  if(isManifest){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
    return;
  }
  const isAppPage=e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/');
  if(isAppPage){e.respondWith(pageWithV77(e.request));return;}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
    const copy=resp.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
    return resp;
  }).catch(()=>caches.match(e.request))));
});
