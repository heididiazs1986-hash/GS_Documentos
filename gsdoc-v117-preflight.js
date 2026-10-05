/* GS Documentos v117 · protección de exportación Excel
   Evita que firmas/base64/archivos internos terminen como celdas de Excel
   y protege contra el límite de 32.767 caracteres por celda. */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V117_PREFLIGHT__) return;
  globalThis.__GS_DOCS_V117_PREFLIGHT__=true;

  const MAX_CELL=32000;
  const blockedHeader=h=>{
    const raw=String(h||'').trim();
    const s=raw.toLocaleLowerCase('es-CO')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/&[#a-z0-9]+;/gi,'')
      .replace(/[^a-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'');

    const excluded=new Set([
      'tratamiento_de_datos','tratamiento_datos',
      'tecnico_gestor','tecnico_nombre',
      'cedula_tecnico','tecnico_cedula',
      'profesion_tecnico','tecnico_profesion',
      'consejo_profesional','tecnico_consejo',
      'matricula_profesional','tecnico_matricula',
      'fecha_hora_creacion','fecha_hora_creacion_','fecha_creacion','fecha_hora_actualizacion'
    ]);

    return /(^|_)(firma|signature|base64|dataurl|support|supports|soporte|soportes|foto|fotos|imagen|imagenes|archivo|archivos)($|_)/.test(s)
      || excluded.has(s)
      || s==='_txt_selected' || s==='txt_selected';
  };
  const cleanValue=v=>{
    if(v==null) return '';
    if(Array.isArray(v)) return cleanValue(v.join(' | '));
    if(typeof v==='object'){
      try{v=JSON.stringify(v)}catch(_){v=String(v)}
    }
    let s=String(v);
    if(/^data:(image|application)\//i.test(s)) return '';
    if(/^JVBERi0/i.test(s) && s.length>5000) return '';
    if(s.length>MAX_CELL) s=s.slice(0,MAX_CELL);
    // Regla v119: el Excel es la única salida donde el texto operativo
    // se normaliza a MAYÚSCULAS.
    return s.toLocaleUpperCase('es-CO');
  };

  function install(){
    if(!globalThis.XLSX?.utils?.json_to_sheet || globalThis.XLSX.__gs117SafeExport) return false;
    const original=globalThis.XLSX.utils.json_to_sheet;
    globalThis.XLSX.utils.json_to_sheet=function(data,opts={}){
      const rows=Array.isArray(data)?data:[];
      const incomingHeader=Array.isArray(opts.header)?opts.header:null;
      const header=incomingHeader?incomingHeader.filter(h=>!blockedHeader(h)):incomingHeader;
      const cleaned=rows.map(row=>{
        const out={};
        for(const [k,v] of Object.entries(row||{})){
          if(blockedHeader(k)) continue;
          out[k]=cleanValue(v);
        }
        return out;
      });
      return original.call(this,cleaned,{...opts,...(header?{header}:{})});
    };

    const originalWrite=globalThis.XLSX.write;
    globalThis.XLSX.write=function(wb,opts){
      try{
        for(const ws of Object.values(wb?.Sheets||{})){
          if(!ws || typeof ws!=='object') continue;
          for(const [addr,cell] of Object.entries(ws)){
            if(addr[0]==='!' || !cell) continue;
            if(typeof cell.v==='string'){
              if(/^data:(image|application)\//i.test(cell.v)) cell.v='';
              else if(cell.v.length>MAX_CELL) cell.v=cell.v.slice(0,MAX_CELL);
            }
          }
        }
      }catch(e){console.warn('GS v117 saneamiento XLSX',e)}
      return originalWrite.call(this,wb,opts);
    };
    globalThis.XLSX.__gs117SafeExport=true;
    console.info('GS Documentos v117 · protección XLSX activa');
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer)},25);
    setTimeout(()=>clearInterval(timer),5000);
  }


  // Protección contra sobrescribir al usuario anterior por reutilizar el mismo registro.
  // Si ya se terminó/guardó un caso y se pulsa la navegación "Registrar",
  // se usa el flujo interno de "Nuevo registro" en vez de reabrir el registro actual.
  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('.nav,[data-go]');
    if(!el) return;
    const isRegister=el.dataset?.go==='register' || /^\+?\s*registrar$/i.test(String(el.textContent||'').trim());
    if(!isRegister) return;
    const screen=document.body.dataset.screen||'';
    if(screen==='register'||screen==='jornada') return;
    const saved=String(document.getElementById('savedSummary')?.textContent||'').trim();
    const newBtn=document.getElementById('recordsNew')||document.getElementById('newRecordAfterSave');
    if(saved && newBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
      newBtn.click();
    }
  },true);
})();