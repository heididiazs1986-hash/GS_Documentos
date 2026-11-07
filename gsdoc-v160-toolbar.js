/* GS Docs v160 - barra de acciones del encabezado
 * Ordena el encabezado (logo + título + tema arriba) y reúne debajo, en una sola fila:
 *   ✏️ nombre del técnico · 📋 Registros (con contador, lleva directo a ver y exportar) · 💾 memoria.
 * No altera datos: solo mueve botones existentes y agrega el acceso directo a la pantalla de registros. */
(function(){
  'use strict';
  if(window.__GS_DOCS_V160_TOOLBAR__) return; window.__GS_DOCS_V160_TOOLBAR__=true;
  const q=s=>document.querySelector(s);

  const css=document.createElement('style');
  css.textContent=`
  #gsToolbar{display:flex;align-items:center;gap:8px;max-width:1040px;margin:0 auto;padding:2px 2px 9px;box-sizing:border-box}
  #gsToolbar>*{flex:0 0 auto;height:40px!important;margin:0!important;border-radius:99px!important;box-sizing:border-box;font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif!important;white-space:nowrap;display:inline-flex!important;align-items:center;justify-content:center;gap:6px;padding:0 12px!important;width:auto!important;min-width:0!important;position:static!important}
  #gsToolbar #gs149EditTech{flex:1 1 0;justify-content:flex-start;overflow:hidden;min-width:0!important}
  #gsToolbar #gs149EditTech .gs149-tech-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;max-width:100%}
  #gsToolbar #gsRecordsBtn{border:0;background:#FF6600;color:#fff;box-shadow:0 2px 8px rgba(255,102,0,.35);cursor:pointer}
  #gsToolbar #gsRecordsBtn .n{background:#fff;color:#B34700;border-radius:99px;min-width:20px;height:20px;padding:0 6px;display:inline-grid;place-items:center;font-size:12px}
  body[data-screen="jornada"] #gsToolbar #gs149EditTech{background:#E1F4FF!important;border-color:#79D1FF!important}
  body[data-screen="records"] #gsToolbar #gsRecordsBtn{background:#B34700;box-shadow:inset 0 0 0 2px #fff6}
  #gsToolbar #gsMemPill{padding:0 12px!important;border:0}
  .head-actions #gs149EditTech,.head-actions #gsMemPill{display:none!important}
  #gsToolbar #gs149EditTech,#gsToolbar #gsMemPill{display:inline-flex!important}
  `;
  document.head.appendChild(css);

  function recordCount(){
    try{ if(typeof records==='function') return records().length; }catch(_){}
    try{ return JSON.parse(localStorage.getItem('GS_DOCS_REGISTROS_V1')||'[]').length; }catch(_){ return 0; }
  }
  function bar(){
    let b=q('#gsToolbar');
    if(b&&b.isConnected) return b;
    const top=q('header.top')||q('.top'); if(!top) return null;
    b=document.createElement('div'); b.id='gsToolbar'; top.appendChild(b);
    const r=document.createElement('button');
    r.type='button'; r.id='gsRecordsBtn'; r.setAttribute('aria-label','Ver y exportar registros');
    r.innerHTML='<span aria-hidden="true">📋</span><span>Registros</span><span class="n">0</span>';
    r.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();try{show('records')}catch(err){console.warn(err)}});
    b.appendChild(r);
    return b;
  }
  // El botón del técnico lleva a «Inicio» (inicio de jornada, donde se escribe el nombre) en lugar de abrir el editor
  function goInicio(e){
    const t=e.target&&e.target.closest&&e.target.closest('#gs149EditTech');
    if(!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const cur=document.body.dataset.screen; if(cur&&cur!=='jornada') window.__gsPrevScreen=cur;
    try{ show('jornada'); }catch(err){ console.warn(err); }
  }
  const jornadaActiva=()=>{try{return !!(state&&state.jornada&&state.jornada.active)}catch(_){return false}};
  function volver(){
    const input=q('#jornada_nombre'); if(input) input.dispatchEvent(new Event('change',{bubbles:true}));   // guarda el nombre (v149)
    let to=window.__gsPrevScreen||'register'; if(to==='jornada') to='register';
    try{ show(to); }catch(_){ try{show('register')}catch(__){} }
  }
  // En «Inicio» con jornada ya iniciada: botones para volver y «Guardar y volver» en lugar de «Iniciar jornada»
  function inicioNav(){
    const card=q('#jornada .card'), start=q('#jornadaStart'); if(!card) return;
    const onInicio=document.body.dataset.screen==='jornada', activa=jornadaActiva();
    let nav=q('#gsInicioNav');
    if(onInicio&&activa){
      if(!nav){
        nav=document.createElement('div'); nav.id='gsInicioNav';
        nav.style.cssText='display:flex;gap:8px;margin:2px 0 12px';
        nav.innerHTML='<button type="button" class="btn secondary" id="gsInicioBack" style="flex:1">← Volver</button><button type="button" class="btn" id="gsInicioRec" style="flex:1;background:#FF6600;border-color:#FF6600;color:#fff">📋 Registros <b class="n" style="margin-left:6px">0</b></button>';
        const h2=card.querySelector('h2'); h2.insertAdjacentElement('afterend',nav);
        nav.querySelector('#gsInicioBack').addEventListener('click',volver);
        nav.querySelector('#gsInicioRec').addEventListener('click',()=>{try{show('records')}catch(_){}});
      }
      const n=nav.querySelector('.n'); if(n) n.textContent=recordCount();
      if(start&&start.textContent!=='✔ Guardar y volver') start.textContent='✔ Guardar y volver';
    } else {
      if(nav) nav.remove();
      if(start&&start.textContent==='✔ Guardar y volver') start.textContent='Iniciar  →';
    }
    if(start&&!start.__gs160){
      start.__gs160=true;
      start.addEventListener('click',e=>{ if(jornadaActiva()){ e.preventDefault(); e.stopImmediatePropagation(); volver(); } },true);
    }
  }
  function place(){
    const b=bar(); if(!b) return;
    const edit=q('#gs149EditTech'),mem=q('#gsMemPill'),rec=q('#gsRecordsBtn');
    // orden: nombre · registros · memoria
    if(edit&&edit.parentNode!==b) b.insertBefore(edit,rec);
    if(mem&&mem.parentNode!==b) b.appendChild(mem);
    if(edit){
      const ic=edit.querySelector('span[aria-hidden]'); if(ic&&ic.textContent!=='🏠') ic.textContent='🏠';
      if(edit.getAttribute('aria-label')!=='Ir a Inicio (nombre del técnico y jornada)'){edit.setAttribute('aria-label','Ir a Inicio (nombre del técnico y jornada)');edit.title='Ir a Inicio'}
    }
    inicioNav();
    if(b&&!b.__gs160){b.__gs160=true;b.addEventListener('click',goInicio,true)}
    const n=rec&&rec.querySelector('.n'); if(n){const c=recordCount(); if(n.textContent!==String(c)) n.textContent=c;}
  }
  [0,200,600,1500,3000].forEach(ms=>setTimeout(place,ms));
  setInterval(place,1500);
  document.addEventListener('click',()=>setTimeout(place,60),true);
  console.info('GS Docs v160 · barra de acciones activa');
})();
