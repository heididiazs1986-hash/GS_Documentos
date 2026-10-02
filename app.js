/* GS Documentos v106 · cargador offline de bundle */
(async()=>{
 const J=["js-00.html", "js-01.html", "js-02.html", "js-03.html", "js-04.html", "js-05.html", "js-06.html", "js-07.html", "js-08.html", "js-09.html", "js-10.html"], C=["css-00.html", "css-01.html", "css-02.html"];
 const get=async names=>{let s='';for(const n of names){const r=await fetch('./bundle/'+n,{cache:'no-store'});if(!r.ok)throw new Error('No se pudo cargar '+n);s+=await r.text();}return s;};
 const ungzip=async b64=>{const b=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));if(typeof DecompressionStream!=='function')throw new Error('Actualiza Chrome para usar GS Documentos');return await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();};
 const css=await ungzip(await get(C));const st=document.createElement('style');st.id='gs-v106-styles';st.textContent=css;document.head.appendChild(st);
 const code=await ungzip(await get(J));(0,eval)(code);
 if('serviceWorker' in navigator&&document.readyState==='complete')navigator.serviceWorker.register('./sw.js?v=gsdoc-v106-consent-review').catch(()=>{});
})().catch(e=>{console.error(e);document.body.innerHTML='<main style="font-family:system-ui;padding:24px"><h2>GS Documentos</h2><p>No fue posible iniciar la aplicación.</p><pre style="white-space:pre-wrap">'+String(e?.message||e)+'</pre></main>';});