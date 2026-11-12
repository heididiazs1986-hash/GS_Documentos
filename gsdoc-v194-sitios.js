/* GS Documentos v194 · Sitios: captura de coordenadas AL INICIO, con nombre, antes de llenar el registro */
(()=>{
  'use strict';
  if(globalThis.__GS_SITIOS__)return; globalThis.__GS_SITIOS__=true;
  const KEY='GS_DOCS_SITIOS_V1', q=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}};
  const store=a=>{try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}};
  const up=s=>String(s||'').toLocaleUpperCase('es-CO');
  const hm=ts=>{try{const d=new Date(ts);return d.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}catch(e){return''}};
  function dist(a,b){const R=6371000,t=x=>x*Math.PI/180,dl=t(b.lat-a.lat),dn=t(b.lon-a.lon),h=Math.sin(dl/2)**2+Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
  const usedIds=()=>{try{return new Set(JSON.parse(localStorage.getItem('GS_DOCS_REGISTROS_V1')||'[]').map(x=>x.sitio_id).filter(Boolean))}catch(e){return new Set()}};
  const IS_PC=!/Android|iPhone|iPad|iPod|Mobile|Silk|CriOS/i.test(navigator.userAgent||'') && !!(window.matchMedia&&matchMedia('(pointer:fine)').matches);
  let busy=false;

  function listHTML(){
    const sites=load().slice().reverse(),used=usedIds(),cur=state.registration?.sitio_id;
    if(!sites.length)return '<div class="gs-sit-empty">Aún no hay sitios guardados. Captura el primero en la puerta del usuario.</div>';
    return sites.map(s=>`<div class="gs-sit-row ${cur===s.id?'on':''}" data-id="${esc(s.id)}">
      <div class="gs-sit-info"><b>${esc(s.nombre)}</b>${cur===s.id?' <span class="gs-tag">● en uso</span>':used.has(s.id)?' <span class="gs-tag ok">✓ registrado</span>':''}${s.alerta?` <span class="gs-tag warn" title="${esc(s.alerta)}">⚠ ${esc(s.alerta)}</span>`:''}
      <small>${esc(hm(s.ts))} · ±${esc(s.precision)} m · ${esc(s.lat.toFixed(6))}, ${esc(s.lon.toFixed(6))}</small></div>
      <div class="gs-sit-btns"><button type="button" data-a="use">Usar</button><button type="button" data-a="ren" title="Editar nombre">✏️</button>${used.has(s.id)?'':'<button type="button" data-a="del" title="Eliminar">🗑</button>'}</div></div>`).join('');
  }
  function cardHTML(){
    return `<div id="gsSitios" class="gs-sit"><div class="gs-sit-h"><b>📍 Sitio de la visita</b><span>Captura la coordenada en el sitio, ponle nombre y guarda. Luego continúa con otro o llena el registro.</span></div>
      <div class="gs-sit-cap"><input id="gsSitNombre" placeholder="Nombre de la persona / usuario" autocomplete="off"><button type="button" id="gsSitCap" class="btn secondary">📍 Capturar y guardar</button></div>
      <div id="gsSitMsg" class="gs-sit-msg"></div><div id="gsSitList">${listHTML()}</div></div>`;
  }
  const msg=t=>{const m=q('#gsSitMsg');if(m)m.textContent=t||''};
  const refresh=()=>{const l=q('#gsSitList');if(l)l.innerHTML=listHTML()};

  function capture(){
    if(busy)return;
    const inp=q('#gsSitNombre'),nombre=up((inp?.value||'').trim());
    if(!nombre){msg('Escribe primero el nombre de la persona.');inp?.focus();return}
    if(!navigator.geolocation){msg('GPS no disponible en este dispositivo.');return}
    busy=true;const btn=q('#gsSitCap');if(btn)btn.disabled=true;
    let best=null,wid=null,done=false;
    const finish=()=>{
      if(done)return;done=true;try{navigator.geolocation.clearWatch(wid)}catch(e){}
      busy=false;if(btn)btn.disabled=false;
      if(!best){msg('No fue posible obtener GPS. Sal a cielo abierto y repite.');return}
      const prec=Math.round(best.coords.accuracy);
      if(prec>50&&!confirm('Precisión baja (±'+prec+' m).\n\nAceptar aprieta "Aceptar"; para repetir la captura, "Cancelar".')){msg('Captura descartada. Repite al aire libre.');return}
      const s={id:'S'+Date.now().toString(36),nombre,lat:best.coords.latitude,lon:best.coords.longitude,precision:prec,ts:new Date().toISOString(),alerta:''};
      const near=load().map(o=>({o,d:dist(s,o)})).filter(x=>x.d<25&&x.o.nombre!==nombre).sort((a,b)=>a.d-b.d)[0];
      if(near){
        if(!confirm('Esta ubicación coincide (a '+Math.round(near.d)+' m) con «'+near.o.nombre+'».\n\n¿Realmente es un sitio distinto? Si estás en el mismo lugar, no es la casa de '+nombre+'.\nAceptar = guardar con alerta · Cancelar = descartar')){msg('Captura descartada: misma ubicación que '+near.o.nombre+'.');return}
        s.alerta='Igual a '+near.o.nombre;
      }
      const all=load();all.push(s);store(all);
      if(inp)inp.value='';
      refresh();msg('✓ Guardado: '+nombre+' (±'+prec+' m). Puedes capturar otro sitio o pulsar «Usar».');
    };
    msg('Capturando… mantén el celular quieto');
    wid=navigator.geolocation.watchPosition(p=>{
      if(!best||p.coords.accuracy<best.coords.accuracy)best=p;
      msg('Capturando… ±'+Math.round(best.coords.accuracy)+' m');
      if(best.coords.accuracy<=12)finish();
    },e=>{if(!best){msg('GPS: '+e.message);}finish()},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    setTimeout(finish,12000);
  }

  function useSite(id){
    const s=load().find(x=>x.id===id);if(!s)return;
    const r=state.registration||(state.registration={});
    r.latitud=s.lat.toFixed(7);r.longitud=s.lon.toFixed(7);r.precision=String(s.precision);
    r.sitio_id=s.id;r.coord_ts=s.ts;r.coord_alerta=s.alerta||'';
    if(!r.nombres)r.nombres=s.nombre;
    save();renderRegistration();toast('Sitio «'+s.nombre+'» aplicado al registro');
  }

  document.addEventListener('click',e=>{
    const t=e.target;if(!t||!t.closest)return;
    if(t.id==='gsSitCap'){capture();return}
    const row=t.closest('#gsSitios .gs-sit-row'),b=t.closest('#gsSitios [data-a]');
    if(!row||!b)return;
    const id=row.dataset.id,a=b.dataset.a;
    if(a==='use')useSite(id);
    else if(a==='ren'){const all=load(),s=all.find(x=>x.id===id);if(!s)return;const n=prompt('Nombre del sitio / persona:',s.nombre);if(n&&n.trim()){s.nombre=up(n.trim());store(all);refresh()}}
    else if(a==='del'){const all=load(),s=all.find(x=>x.id===id);if(s&&confirm('¿Eliminar el sitio «'+s.nombre+'»?')){store(all.filter(x=>x.id!==id));if(state.registration?.sitio_id===id){['latitud','longitud','precision','sitio_id','coord_ts','coord_alerta'].forEach(k=>delete state.registration[k]);save();renderRegistration()}else refresh()}}
  },true);

  // El técnico no avanza sin coordenada de un sitio capturado.
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('button');
    if(!b||b.id!=='regNext'||state.regStep!==0||state.role!=='tecnico'||state.editingRecordId||IS_PC)return;
    const r=state.registration||{};
    if(!r.latitud||!r.longitud){e.preventDefault();e.stopImmediatePropagation();toast('Primero captura el sitio y pulsa «Usar»');q('#gsSitios')?.scrollIntoView({behavior:'smooth',block:'center'})}
  },true);

  function enhance(){
    const host=q('#regHost');if(!host)return;
    const r=state.registration||{};
    if(state.regStep===0&&!state.editingRecordId&&!q('#gsSitios'))host.insertAdjacentHTML('afterbegin',cardHTML());
    if(state.regStep===5&&r.sitio_id&&state.role==='tecnico'&&!IS_PC){
      const g=q('#gpsBtn');if(g)g.style.display='none';
      const h=q('#gs122CoordHelp');if(h)h.textContent='Coordenadas tomadas en el sitio ('+hm(r.coord_ts)+(r.coord_alerta?' · ⚠ '+r.coord_alerta:'')+'). Para cambiarlas, vuelve al paso 1 y elige otro sitio.';
    }
  }
  try{
    const old=renderRegistration;
    renderRegistration=function(){const out=old.apply(this,arguments);try{enhance()}catch(e){console.warn('GS sitios',e)}return out};
  }catch(_){}
  // El TXT no debe pisar las coordenadas del sitio capturado.
  try{
    const oldTxt=applyTxtRecord;
    applyTxtRecord=function(rec){
      const r=state.registration||{},keep=(r.sitio_id&&!IS_PC)?{latitud:r.latitud,longitud:r.longitud,precision:r.precision}:null;
      const out=oldTxt.apply(this,arguments);
      if(keep&&state.registration){Object.assign(state.registration,keep);try{save()}catch(e){}}
      return out;
    };
  }catch(_){}
  setTimeout(()=>{try{enhance()}catch(e){}},300);

  const st=document.createElement('style');
  st.textContent=`.gs-sit{border:1.5px solid var(--gs-orange-line,#FFC7A6);background:var(--gs-orange-soft,#FFF0E7);border-radius:16px;padding:12px;margin-bottom:14px}
  .gs-sit-h{display:flex;flex-direction:column;gap:2px;margin-bottom:10px;color:var(--gs-ink,#17324F)}.gs-sit-h span{font-size:12.5px;opacity:.8}
  .gs-sit-cap{display:flex;gap:8px;flex-wrap:wrap}.gs-sit-cap input{flex:1 1 180px;min-width:0}
  .gs-sit-msg{font-size:13px;margin:8px 0;min-height:4px;color:var(--gs-blue,#0B3C70);font-weight:600}
  .gs-sit-row{display:flex;gap:8px;align-items:center;justify-content:space-between;background:#fff;border:1px solid var(--gs-orange-line,#FFC7A6);border-radius:12px;padding:8px 10px;margin-top:6px}
  .gs-sit-row.on{border-color:var(--gs-blue,#0B3C70);background:var(--gs-blue-light,#E8F5FF)}
  .gs-sit-info{display:flex;flex-direction:column;min-width:0;font-size:14px}.gs-sit-info small{color:#5b6b7c;font-size:11.5px}
  .gs-tag{font-size:11px;font-weight:700;color:var(--gs-blue,#0B3C70)}.gs-tag.ok{color:var(--gs-blue-2,#174F89)}.gs-tag.warn{color:var(--gs-orange,#FF6B16)}
  .gs-sit-btns{display:flex;gap:6px;flex-shrink:0}.gs-sit-btns button{border:1px solid var(--gs-blue,#0B3C70);background:#fff;color:var(--gs-blue,#0B3C70);border-radius:10px;padding:7px 10px;font-weight:700;cursor:pointer}
  .gs-sit-btns button[data-a=use]{background:var(--gs-blue,#0B3C70);color:#fff}.gs-sit-empty{font-size:13px;color:#5b6b7c}`;
  document.head.appendChild(st);
})();
