/* GS Documentos v126 · formato TXT descargable */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V126_TXT_TEMPLATE__) return;
  globalThis.__GS_DOCS_V126_TXT_TEMPLATE__=true;

  function enhanceTxtTemplate(){
    const row=document.querySelector('.txt-box .txt-row');
    if(!row || document.getElementById('gs126TxtTemplate')) return;

    const link=document.createElement('a');
    link.id='gs126TxtTemplate';
    link.className='btn ghost gs126-txt-template';
    link.href='./FORMATO_TXT_GS_DOCUMENTOS.txt';
    link.download='FORMATO_TXT_GS_DOCUMENTOS.txt';
    link.setAttribute('aria-label','Descargar formato TXT para GS Documentos');
    link.innerHTML='📄 Formato TXT';

    const upload=row.querySelector('.file-button');
    if(upload && upload.nextSibling) row.insertBefore(link,upload.nextSibling);
    else row.appendChild(link);

    const box=row.closest('.txt-box');
    if(box && !box.querySelector('.gs126-txt-template-help')){
      const help=document.createElement('div');
      help.className='gs126-txt-template-help';
      help.innerHTML='Descarga la plantilla con las <b>10 columnas</b> y un ejemplo listo para copiar.';
      row.insertAdjacentElement('afterend',help);
    }
  }

  try{
    if(typeof renderRegistration==='function'){
      const oldRender=renderRegistration;
      renderRegistration=function(){
        const r=oldRender.apply(this,arguments);
        setTimeout(enhanceTxtTemplate,0);
        return r;
      };
    }
  }catch(_){}

  const host=document.getElementById('regHost');
  if(host){
    new MutationObserver(()=>enhanceTxtTemplate()).observe(host,{childList:true,subtree:true});
  }
  setTimeout(enhanceTxtTemplate,0);
  console.info('GS Documentos v126 · formato TXT descargable activo');
})();