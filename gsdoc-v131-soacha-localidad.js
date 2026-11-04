/* GS Documentos v131 · Soacha en lista de localidades */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V131_SOACHA_LOCALIDAD__) return;
  globalThis.__GS_DOCS_V131_SOACHA_LOCALIDAD__=true;

  function addSoachaLocality(){
    const select=document.getElementById('reg_localidad');
    if(!select) return;
    const exists=[...select.options].some(o=>String(o.value).trim().toLocaleLowerCase('es-CO')==='soacha');
    if(!exists){
      const opt=document.createElement('option');
      opt.value='Soacha';
      opt.textContent='Soacha';
      const placeholder=[...select.options].find(o=>!o.value);
      if(placeholder && placeholder.nextSibling) select.insertBefore(opt,placeholder.nextSibling);
      else select.appendChild(opt);
    }
    if(String(state?.registration?.localidad||'').trim().toLocaleLowerCase('es-CO')==='soacha'){
      select.value='Soacha';
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