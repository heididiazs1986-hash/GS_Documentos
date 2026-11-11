/* GS · Dictado por voz robusto (v1)
 * - Un micrófono dentro de cada campo de texto largo (textarea) y de los que lleven data-voz. Toca para dictar, toca para parar.
 * - No se corta solo: si el navegador cierra la escucha (lo hace cada ~1 minuto o tras un silencio) se reconecta sin que tengas que hacer nada.
 * - Escribe en el lugar donde está el cursor, con mayúscula al inicio de frase y comandos: «punto», «coma», «dos puntos», «nueva línea».
 * - Muestra lo que va entendiendo en gris mientras hablas y solo lo escribe cuando está seguro (evita textos repetidos en Android).
 * - Mantiene la pantalla encendida mientras dictas.
 * Requiere conexión a internet (el reconocimiento lo hace el navegador en sus servidores). Sin soporte, avisa y sugiere el micrófono del teclado. */
(function(){
  'use strict';
  if(globalThis.GS_VOZ) return;
  const SR=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
  const LANG='es-CO';
  const css=`.gsv-wrap{position:relative;display:block}
  .gsv-mic{position:absolute;right:8px;bottom:8px;width:38px;height:38px;border-radius:50%;border:0;background:#ff6600;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);padding:0;z-index:2;-webkit-tap-highlight-color:transparent}
  .gsv-mic svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .gsv-mic.live{background:#d92d20;animation:gsvp 1.2s infinite}
  .gsv-mic[disabled]{opacity:.45}
  @keyframes gsvp{0%{box-shadow:0 0 0 0 rgba(217,45,32,.55)}70%{box-shadow:0 0 0 12px rgba(217,45,32,0)}100%{box-shadow:0 0 0 0 rgba(217,45,32,0)}}
  .gsv-wrap>textarea,.gsv-wrap>input{padding-right:52px!important;box-sizing:border-box}
  .gsv-st{display:none;font:600 12.5px system-ui,sans-serif;color:#5b6670;margin:4px 2px 0;min-height:16px;line-height:1.35}
  .gsv-st.on{display:block}.gsv-st b{color:#d92d20}.gsv-st i{font-style:normal;opacity:.75}
  .gsv-st.err{color:#b42318}`;
  const ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  function injectCss(){ if(document.getElementById('gsv-css'))return; const s=document.createElement('style'); s.id='gsv-css'; s.textContent=css; document.head.appendChild(s); }

  const state={rec:null,target:null,btn:null,stEl:null,on:false,started:0,quick:0,wake:null,restartT:null,gotAny:false};

  const CMDS=[[/\b(nueva línea|nueva linea|punto aparte|siguiente línea)\b/gi,'\n'],[/\s*\b(dos puntos)\b/gi,':'],[/\s*\b(punto y coma)\b/gi,';'],[/\s*\b(coma)\b/gi,','],[/\s*\b(punto final|punto)\b/gi,'.'],[/\s*\b(signo de interrogación|interrogación)\b/gi,'?']];
  function clean(t){ let s=' '+String(t||'').trim()+' '; for(const [re,r] of CMDS) s=s.replace(re,r); s=s.replace(/[ \t]+([,.;:?])/g,'$1').replace(/^[ \t]+|[ \t]+$/g,'').replace(/[ \t]*\n[ \t]*/g,'\n'); return s.replace(/([.?!]\s+|\n)([a-záéíóúñ])/g,(m,p,c)=>p+c.toUpperCase()); }

  function insert(el,text){
    text=clean(text); if(!text) return;
    const v=el.value||''; let a=typeof el.selectionStart==='number'?el.selectionStart:v.length, b=typeof el.selectionEnd==='number'?el.selectionEnd:a;
    if(!el.__gsvTouched&&document.activeElement!==el){ a=b=v.length; }       // si no está enfocado, se agrega al final
    const before=v.slice(0,a), after=v.slice(b);
    const prev=before.replace(/[ \t]+$/,'').slice(-1);
    const newSentence=!before.trim()||/[.!?\n]$/.test(prev);
    let t=text; if(newSentence) t=t.charAt(0).toUpperCase()+t.slice(1);
    const sep=(!before||/[\s\n(¿¡]$/.test(before)||/^[,.;:?\n]/.test(t))?'':' ';
    const ins=sep+t+(/^[\n]/.test(after)||!after||/^[\s,.;:?]/.test(after)?'':' ');
    el.value=before+ins+after; const pos=(before+ins).length;
    try{el.setSelectionRange(pos,pos)}catch(_){}
    el.__gsvTouched=true;
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
    if(el.scrollHeight>el.clientHeight && el.tagName==='TEXTAREA') el.scrollTop=el.scrollHeight;
  }

  function status(html,err){ const e=state.stEl; if(!e) return; e.className='gsv-st'+(html?' on':'')+(err?' err':''); e.innerHTML=html||''; }
  async function wakeOn(){ try{ if(navigator.wakeLock&&!state.wake){ state.wake=await navigator.wakeLock.request('screen'); state.wake.addEventListener?.('release',()=>{state.wake=null}); } }catch(_){} }
  function wakeOff(){ try{ state.wake&&state.wake.release(); }catch(_){} state.wake=null; }

  function finish(msg,err){
    state.on=false; clearTimeout(state.restartT);
    try{ state.rec&&(state.rec.onend=null,state.rec.onerror=null,state.rec.onresult=null,state.rec.abort()); }catch(_){}
    state.rec=null; wakeOff();
    if(state.btn){ state.btn.classList.remove('live'); state.btn.setAttribute('aria-pressed','false'); }
    status(msg||'',err); if(msg&&!err) setTimeout(()=>{ if(!state.on) status(''); },2500);
    if(err&&msg) setTimeout(()=>{ if(!state.on) status(''); },7000);
  }

  function begin(){
    if(!state.on) return;
    const r=new SR(); state.rec=r; r.lang=LANG; r.continuous=true; r.interimResults=true; r.maxAlternatives=1;
    const done=new Set(); state.started=Date.now(); state.gotAny=false;
    r.onstart=()=>{ status('<b>● Escuchando…</b> <i>toca el micrófono para parar</i>'); };
    r.onresult=e=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const res=e.results[i], txt=(res[0]&&res[0].transcript)||'';
        if(res.isFinal){ if(!done.has(i)){ done.add(i); insert(state.target,txt); state.gotAny=true; state.quick=0; } }
        else interim+=txt;
      }
      status('<b>● Escuchando…</b> '+(interim?'<i>'+interim.replace(/</g,'&lt;')+'</i>':'<i>toca el micrófono para parar</i>'));
    };
    r.onerror=ev=>{
      const c=ev&&ev.error;
      if(c==='no-speech'||c==='aborted') return;                       // se reintenta en onend
      if(c==='not-allowed'||c==='service-not-allowed') return finish('El micrófono está bloqueado. Permítelo en los permisos del sitio y vuelve a tocar el micrófono.',true);
      if(c==='audio-capture') return finish('No encuentro un micrófono disponible (¿otra app lo está usando?).',true);
      if(c==='network') return finish('El dictado necesita internet. Revisa tu conexión y vuelve a intentarlo.',true);
      if(c==='language-not-supported') return finish('Tu navegador no tiene dictado en español.',true);
    };
    r.onend=()=>{
      if(!state.on) return;
      const dur=Date.now()-state.started;
      if(!state.gotAny&&dur<1200){ state.quick++; } else if(state.gotAny||dur>=1200){ state.quick=Math.max(0,state.quick-1); }
      if(state.quick>=5) return finish('No pude mantener el micrófono activo. Cierra otras apps que lo usen y vuelve a intentar.',true);
      state.restartT=setTimeout(()=>{ try{ begin(); }catch(_){ finish('No pude reconectar el dictado.',true); } },dur<1200?500:150);
    };
    try{ r.start(); }catch(_){ state.restartT=setTimeout(begin,400); }
  }

  function stop(){ if(state.on) finish('Dictado detenido.'); }

  function toggle(el,btn){
    if(!SR&&globalThis.GS_VOZ_NATIVE){ try{ el.__gsvTouched=true; globalThis.GS_VOZ_NATIVE.start(txt=>insert(el,txt)); }catch(_){ toastMsg('No fue posible abrir el dictado.'); } return; }
    if(!SR){ toastMsg('Este navegador no tiene dictado integrado. Usa el micrófono de tu teclado (🎤) para dictar.'); return; }
    if(state.on&&state.target===el){ stop(); return; }
    if(state.on) finish('');
    injectCss();
    state.target=el; state.btn=btn||null; state.stEl=statusFor(el); state.on=true; state.quick=0;
    if(btn){ btn.classList.add('live'); btn.setAttribute('aria-pressed','true'); }
    try{ el.focus({preventScroll:true}); }catch(_){}
    el.__gsvTouched=true; wakeOn(); begin();
  }
  function toastMsg(m){
    try{ if(globalThis.GS&&GS.toast) return GS.toast(m); }catch(_){}
    let t=document.getElementById('gsv-toast'); if(!t){ t=document.createElement('div'); t.id='gsv-toast'; t.setAttribute('role','status'); t.style.cssText='position:fixed;left:50%;bottom:88px;transform:translateX(-50%);max-width:88vw;background:#1b1f23;color:#fff;padding:11px 16px;border-radius:12px;font:600 13.5px system-ui,sans-serif;z-index:2147483600;box-shadow:0 6px 20px rgba(0,0,0,.3);text-align:center'; document.body.appendChild(t); }
    t.textContent=m; t.style.display='block'; clearTimeout(t._t); t._t=setTimeout(()=>{t.style.display='none'},4200);
  }
  function statusFor(el){ let s=el.__gsvSt; if(!s||!s.isConnected){ s=document.createElement('div'); s.className='gsv-st'; s.setAttribute('role','status'); s.setAttribute('aria-live','polite'); const host=el.closest('.gsv-wrap')||el; host.insertAdjacentElement('afterend',s); el.__gsvSt=s; } return s; }

  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&state.on) finish('Dictado detenido al salir de la pantalla.'); else if(!document.hidden&&state.on) wakeOn(); });
  window.addEventListener('pagehide',()=>{ if(state.on) finish(''); });

  const skip=el=>el.dataset.novoz!==undefined||el.readOnly||el.disabled||el.closest('[data-novoz]')||el.__gsvWrapped||el.closest('.dict')||el.type==='password';
  function attach(el){
    if(!el||skip(el)||!SR&&false) return;
    injectCss(); el.__gsvWrapped=true;
    const w=document.createElement('div'); w.className='gsv-wrap'; el.parentNode.insertBefore(w,el); w.appendChild(el);
    const b=document.createElement('button'); b.type='button'; b.className='gsv-mic'; b.setAttribute('aria-label','Dictar por voz'); b.setAttribute('aria-pressed','false'); b.innerHTML=ICON;
    if(!SR) b.style.opacity='.55';
    b.addEventListener('pointerdown',e=>e.preventDefault());           // no le quita el foco al campo
    b.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); toggle(el,b); });
    w.appendChild(b);
    el.addEventListener('blur',()=>{ /* el dictado sigue aunque cambies de campo con el dedo; se detiene solo con el micrófono */ });
  }
  function scan(root){ (root||document).querySelectorAll('textarea,[data-voz]').forEach(el=>{ if(el.matches('textarea,input[type=text],input[type=search],input:not([type])')) attach(el); }); }
  function auto(){ scan(document); new MutationObserver(m=>{ for(const x of m) for(const n of x.addedNodes){ if(n.nodeType!==1) continue; if(n.matches&&n.matches('textarea,[data-voz]')) attach(n); n.querySelectorAll&&n.querySelectorAll('textarea,[data-voz]').forEach(attach); } }).observe(document.documentElement,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',auto); else auto();

  globalThis.GS_VOZ={toggle,stop,attach,scan,supported:!!SR,version:'v1',_clean:clean,_insert:insert};
})();
