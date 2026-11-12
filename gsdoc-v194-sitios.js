/* GS Documentos v197 · Capturas de ubicación: pin flotante + histórico opcional en el control de coordenadas */
(()=>{
  'use strict';
  if(globalThis.__GS_SITIOS__)return; globalThis.__GS_SITIOS__=true;
  if(window.top!==window.self)return;
  const KEY='GS_DOCS_SITIOS_V1',q=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}};
  const store=a=>{try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}};
  const up=s=>String(s||'').toLocaleUpperCase('es-CO');
  const hm=ts=>{try{const d=new Date(ts);return d.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}catch(e){return''}};
  const byName=(a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'})||String(a.ts).localeCompare(String(b.ts));
  function dist(a,b){const R=6371000,t=x=>x*Math.PI/180,dl=t(b.lat-a.lat),dn=t(b.lon-a.lon),h=Math.sin(dl/2)**2+Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
  const usedIds=()=>{try{return new Set(JSON.parse(localStorage.getItem('GS_DOCS_REGISTROS_V1')||'[]').map(x=>x.sitio_id).filter(Boolean))}catch(e){return new Set()}};
  let busy=false,askedThisVisit=false;

  /* ---------- estilos ---------- */
  const st=document.createElement('style');
  st.textContent=`
  #gsPin{position:relative;flex:none;margin:0 10px 0 auto;width:40px;height:40px;-webkit-tap-highlight-color:transparent}
  .reg-head{align-items:center}
  #gsPin:before,#gsPin:after{content:"";position:absolute;inset:0;border-radius:50%;background:rgba(121,209,255,.55);animation:gsPinWave 2.8s ease-out infinite;pointer-events:none}
  #gsPin:after{animation-delay:1.4s}
  @keyframes gsPinWave{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.1);opacity:0}}
  #gsPin .p{position:absolute;inset:0;border:0;border-radius:50%;background:#DDF2FF;border:2px solid rgba(121,209,255,.95);box-shadow:0 2px 8px rgba(11,60,112,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
  #gsPin .p svg{width:26px;height:26px}
  #gsPin .n[hidden]{display:none}
  #gsPin .n{position:absolute;right:-4px;top:-4px;min-width:18px;height:18px;border-radius:9px;background:#FF6B16;color:#fff;font:700 11px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:0 4px}
  .gsM{position:fixed;inset:0;z-index:2147482500;background:rgba(11,60,112,.35);display:flex;align-items:flex-end;justify-content:center}
  .gsM .box{background:#fff;width:min(460px,100%);max-height:86vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#17324F;box-shadow:0 -6px 24px rgba(0,0,0,.2)}
  @media(min-width:700px){.gsM{align-items:center}.gsM .box{border-radius:18px}}
  .gsM h3{margin:0 0 4px;font-size:17px;color:#0B3C70}.gsM p{margin:0 0 10px;font-size:13px;opacity:.8}
  .gsM input,.gsM select{width:100%;box-sizing:border-box;padding:11px;border:1.5px solid #FFC7A6;border-radius:12px;font-size:15px;margin-bottom:8px;background:#fff}
  .gsM .row{display:flex;gap:8px}.gsM .row>*{flex:1}
  .gsM button{border:0;border-radius:12px;padding:12px;font-weight:700;font-size:14px;cursor:pointer}
  .gsM .pri{background:#0B3C70;color:#fff}.gsM .sec{background:#E8F5FF;color:#0B3C70}.gsM .org{background:#FF6B16;color:#fff}
  .gsM .msg{font-size:13px;font-weight:600;color:#0B3C70;min-height:18px;margin:2px 0 6px}
  .gsM .it{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid #FFC7A6;background:#FFF0E7;border-radius:12px;padding:8px 10px;margin-top:6px}
  .gsM .it div{min-width:0;font-size:14px}.gsM .it small{display:block;color:#5b6b7c;font-size:11.5px}
  .gsM .it .tg{font-size:11px;font-weight:700;color:#FF6B16}
  .gsM .it .bt{display:flex;gap:6px;flex-shrink:0}.gsM .it .bt button{padding:7px 10px;background:#fff;border:1px solid #0B3C70;color:#0B3C70}`;
  document.head.appendChild(st);

  /* ---------- pin flotante ---------- */
  const pin=document.createElement('div');pin.id='gsPin';pin.setAttribute('aria-label','Capturar ubicación');
  pin.innerHTML=`<button class="p" type="button" title="Capturar ubicación"><svg viewBox="0 0 24 24"><path d="M12 2C7.6 2 4 5.5 4 9.8c0 5.6 8 12.2 8 12.2s8-6.6 8-12.2C20 5.5 16.4 2 12 2z" fill="#FF6B16"/><circle cx="12" cy="9.8" r="3.2" fill="#fff"/></svg></button><span class="n" hidden></span>`;
  const badge=()=>{const n=load().length,b=pin.querySelector('.n');b.hidden=!n;b.textContent=n};
  pin.addEventListener('click',openPanel);
  const mount=()=>{const prog=q('#regProgress');if(!prog||!prog.parentNode)return setTimeout(mount,200);prog.parentNode.insertBefore(pin,prog);badge()};
  mount();

  /* ---------- panel de captura ---------- */
  function modal(html){
    closeModal();
    const m=document.createElement('div');m.className='gsM';m.innerHTML=`<div class="box">${html}</div>`;
    m.addEventListener('click',e=>{if(e.target===m)closeModal()});document.body.appendChild(m);return m;
  }
  const closeModal=()=>{document.querySelectorAll('.gsM').forEach(x=>x.remove())};
  const msg=t=>{const m=q('.gsM .msg');if(m)m.textContent=t||''};

  function listHTML(){
    const sites=load().sort(byName),used=usedIds();
    if(!sites.length)return '<p>Aún no hay capturas guardadas.</p>';
    return sites.map(s=>`<div class="it" data-id="${esc(s.id)}"><div><b>${esc(s.nombre)}</b> ${used.has(s.id)?'<span class="tg" style="color:#174F89">✓ registrado</span>':''}${s.alerta?` <span class="tg">⚠ ${esc(s.alerta)}</span>`:''}<small>${esc(hm(s.ts))} · ±${esc(s.precision)} m · ${esc(s.lat.toFixed(6))}, ${esc(s.lon.toFixed(6))}</small></div><div class="bt"><button type="button" data-a="ren">✏️</button>${used.has(s.id)?'':'<button type="button" data-a="del">🗑</button>'}</div></div>`).join('');
  }
  function openPanel(){
    modal(`<h3>📍 Capturar ubicación</h3><p>Ponle nombre y guarda. Luego, al llenar el registro, podrás elegirla desde el histórico.</p>
      <input id="gsNom" placeholder="Nombre de la persona / usuario" autocomplete="off">
      <div class="row"><button type="button" class="org" id="gsCap">📍 Capturar y guardar</button><button type="button" class="sec" id="gsCerrar">Cerrar</button></div>
      <div class="msg"></div><div id="gsLst">${listHTML()}</div>`);
    setTimeout(()=>q('#gsNom')?.focus(),50);
  }
  const refresh=()=>{const l=q('#gsLst');if(l)l.innerHTML=listHTML();badge()};

  function capture(){
    if(busy)return;
    const inp=q('#gsNom'),nombre=up((inp?.value||'').trim());
    if(!nombre){msg('Escribe primero el nombre de la persona.');inp?.focus();return}
    if(!navigator.geolocation){msg('GPS no disponible en este dispositivo.');return}
    busy=true;const btn=q('#gsCap');if(btn)btn.disabled=true;
    let best=null,wid=null,done=false;
    const finish=()=>{
      if(done)return;done=true;try{navigator.geolocation.clearWatch(wid)}catch(e){}
      busy=false;if(btn)btn.disabled=false;
      if(!best){msg('No fue posible obtener GPS. Sal a cielo abierto y repite.');return}
      const prec=Math.round(best.coords.accuracy);
      if(prec>50&&!confirm('Precisión baja (±'+prec+' m).\n\nAceptar = guardar igual · Cancelar = repetir al aire libre')){msg('Captura descartada. Repite al aire libre.');return}
      const s={id:'S'+Date.now().toString(36),nombre,lat:best.coords.latitude,lon:best.coords.longitude,precision:prec,ts:new Date().toISOString(),alerta:''};
      const near=load().map(o=>({o,d:dist(s,o)})).filter(x=>x.d<25&&x.o.nombre!==nombre).sort((a,b)=>a.d-b.d)[0];
      if(near){
        if(!confirm('Esta ubicación coincide (a '+Math.round(near.d)+' m) con «'+near.o.nombre+'».\n\n¿Realmente es un sitio distinto?\nAceptar = guardar con alerta · Cancelar = descartar')){msg('Captura descartada: misma ubicación que '+near.o.nombre+'.');return}
        s.alerta='Igual a '+near.o.nombre;
      }
      const all=load();all.push(s);store(all);
      if(inp){inp.value='';inp.focus()}
      refresh();msg('✓ Guardado: '+nombre+' (±'+prec+' m). Puedes capturar otra.');
    };
    msg('Capturando… mantén el celular quieto');
    wid=navigator.geolocation.watchPosition(p=>{
      if(!best||p.coords.accuracy<best.coords.accuracy)best=p;
      msg('Capturando… ±'+Math.round(best.coords.accuracy)+' m');
      if(best.coords.accuracy<=12)finish();
    },e=>{if(!best)msg('GPS: '+e.message);finish()},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    setTimeout(finish,12000);
  }

  document.addEventListener('click',e=>{
    const t=e.target;if(!t||!t.closest)return;
    if(t.id==='gsCap'){capture();return}
    if(t.id==='gsCerrar'||t.id==='gsNo'){closeModal();return}
    if(t.id==='gsSi'){openPicker();return}
    const row=t.closest('.gsM .it'),b=t.closest('.gsM [data-a]');
    if(!row||!b)return;
    const id=row.dataset.id,a=b.dataset.a,all=load(),s=all.find(x=>x.id===id);if(!s)return;
    if(a==='ren'){const n=prompt('Nombre:',s.nombre);if(n&&n.trim()){s.nombre=up(n.trim());store(all);refresh()}}
    else if(a==='del'&&confirm('¿Eliminar la captura de «'+s.nombre+'»?')){store(all.filter(x=>x.id!==id));refresh()}
  },true);

  /* ---------- histórico en el control de coordenadas ---------- */
  function applySite(id){
    const s=load().find(x=>x.id===id);if(!s)return;
    const r=state.registration||(state.registration={});
    r.latitud=s.lat.toFixed(7);r.longitud=s.lon.toFixed(7);r.precision=String(s.precision);
    r.sitio_id=s.id;r.coord_ts=s.ts;r.coord_alerta=s.alerta||'';
    closeModal();save();renderRegistration();toast('Ubicación de «'+s.nombre+'» aplicada');
  }
  function openPicker(){
    const sites=load().sort(byName);
    modal(`<h3>Elige la ubicación</h3><p>Capturas guardadas, en orden alfabético.</p>
      <select id="gsSel" size="${Math.min(8,sites.length+1)}"><option value="" disabled selected>Selecciona…</option>${sites.map(s=>`<option value="${esc(s.id)}">${esc(s.nombre)} · ${esc(hm(s.ts))} · ±${esc(s.precision)} m${s.alerta?' ⚠':''}</option>`).join('')}</select>
      <div class="row"><button type="button" class="sec" id="gsNo">Cancelar</button></div>`);
    const sel=q('#gsSel');sel.addEventListener('change',()=>{if(sel.value)applySite(sel.value)});
  }
  function ask(){
    modal(`<h3>¿Usar ubicación en histórico?</h3><p>Tienes ${load().length} captura(s) guardada(s).</p><div class="row"><button type="button" class="pri" id="gsSi">Sí</button><button type="button" class="sec" id="gsNo">No</button></div>`);
  }
  function enhance(){
    const r=state.registration||{};
    if(state.regStep!==5){askedThisVisit=false;return}
    if(askedThisVisit||r.latitud||r.longitud||!load().length)return;
    askedThisVisit=true;ask();
  }
  try{
    const old=renderRegistration;
    renderRegistration=function(){const out=old.apply(this,arguments);try{enhance()}catch(e){console.warn('GS ubicación',e)}return out};
  }catch(_){}
})();
