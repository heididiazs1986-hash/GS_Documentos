/* GS Documentos v131 · Soacha en lista de localidades */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V131_SOACHA_LOCALIDAD__) return;
  globalThis.__GS_DOCS_V131_SOACHA_LOCALIDAD__=true;

  function addSoachaLocality(){
    const select=document.getElementById('reg_localidad');
    if(!select) return;

    const storedLocality=(typeof state!=='undefined' && state && state.registration) ? state.registration.localidad : '';
    const selectedValue=String(select.value||storedLocality||'').trim();
    const exists=[...select.options].some(o=>String(o.value).trim().toLocaleLowerCase('es-CO')==='soacha');

    if(!exists){
      const opt=document.createElement('option');
      opt.value='Soacha';
      opt.textContent='Soacha';
      select.appendChild(opt);
    }

    // Mantener "Selecciona..." primero y ordenar TODAS las localidades
    // alfabéticamente, incluida Soacha.
    const placeholder=[...select.options].find(o=>!String(o.value||'').trim());
    const ordered=[...select.options]
      .filter(o=>String(o.value||'').trim())
      .sort((a,b)=>String(a.textContent||a.value).localeCompare(
        String(b.textContent||b.value),
        'es',
        {sensitivity:'base'}
      ));

    select.innerHTML='';
    if(placeholder) select.appendChild(placeholder);
    else {
      const p=document.createElement('option');
      p.value='';
      p.textContent='Selecciona...';
      select.appendChild(p);
    }
    ordered.forEach(o=>select.appendChild(o));

    if(selectedValue && [...select.options].some(o=>o.value===selectedValue)){
      select.value=selectedValue;
    }
  }

  try{
    if(typeof renderRegistration==='function'){
      const previous=renderRegistration;
      renderRegistration=function(){
        const out=previous.apply(this,arguments);
        setTimeout(addSoachaLocality,0);
        return out;
      };
    }
  }catch(_){}

  const host=document.getElementById('regHost');
  if(host){
    new MutationObserver(addSoachaLocality).observe(host,{childList:true,subtree:true});
  }
  setTimeout(addSoachaLocality,0);
  console.info('GS Documentos v131 · Soacha agregado a localidades');
})();