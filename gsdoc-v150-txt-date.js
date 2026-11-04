/* GS Documentos v150 · TXT de 11 columnas con Fecha_RO -> Fecha de registro */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V150_TXT_DATE__) return;
  globalThis.__GS_DOCS_V150_TXT_DATE__=true;

  const clean=s=>String(s??'').trim();
  const canon=h=>clean(h).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function splitLine(line,delim='|'){
    const out=[]; let cur='', q=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'){
        if(q && line[i+1]==='"'){cur+='"';i++}
        else q=!q;
      }else if(c===delim && !q){out.push(cur.trim());cur=''}
      else cur+=c;
    }
    out.push(cur.trim());
    return out;
  }

  function isoDate(v){
    const s=clean(v);
    if(!s) return '';
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if(m) return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if(m) return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
    return s;
  }

  function normalizeAddressSafe(v){
    try{return typeof normalizeAddress==='function'?normalizeAddress(v):clean(v)}catch(_){return clean(v)}
  }
  function normalizeContactSafe(v){
    try{return typeof normalizeContact==='function'?normalizeContact(v):clean(v)}catch(_){return clean(v)}
  }
  function titleSafe(v){
    try{return typeof upperCaseWords==='function'?upperCaseWords(v):clean(v)}catch(_){return clean(v)}
  }

  // Nuevo formato oficial:
  // RO/ORDEN | FECHA_RO | NOMBRES | IDENTIFICACION | CONTACTO | DIRECCION |
  // LOCALIDAD | SECTOR/BARRIO | TIPO ZONA | LATITUD | LONGITUD
  try{
    parseTxt=function(text){
      const cleanText=String(text||'').replace(/^\uFEFF/,'').replace(/\r/g,'');
      const lines=cleanText.split('\n').filter(x=>x.trim());
      if(lines.length<2) return [];

      const headRaw=splitLine(lines[0]);
      const head=headRaw.map(canon);

      if(headRaw.length!==11){
        throw new Error('El TXT debe tener exactamente 11 columnas separadas por |');
      }

      const defs=[
        ['orden_ro',['ro orden','orden ro','ro','orden']],
        ['fecha_registro',['fecha ro','fecha_ro','fecha de registro','fecha registro']],
        ['nombres',['nombres','nombre','nombre usuario','usuario']],
        ['identificacion',['identificacion','cedula','cc']],
        ['contacto',['contacto','celular','telefono']],
        ['direccion',['direccion','direccion predio','dirección predio']],
        ['localidad',['localidad']],
        ['sector',['sector barrio','sector/barrio','sector','barrio']],
        ['tipo_zona',['tipo zona','tipo_zona','zona']],
        ['latitud',['latitud','latitud y','latitud (y)']],
        ['longitud',['longitud','longitud x','longitud (x)']]
      ];

      const index={};
      for(const [key,aliases] of defs){
        const normalized=aliases.map(canon);
        const i=head.findIndex(h=>normalized.includes(h));
        if(i<0) throw new Error('Falta la columna '+key);
        index[key]=i;
      }

      return lines.slice(1).map((line,n)=>{
        const cols=splitLine(line);
        if(cols.length!==11) return null;
        const r={_txt:n+1};
        for(const [k,i] of Object.entries(index)) r[k]=cols[i]||'';
        r.orden_ro=clean(r.orden_ro).replace(/\D/g,'').slice(0,10);
        r.fecha_registro=isoDate(r.fecha_registro);
        r.nombres=titleSafe(r.nombres);
        r.sector=titleSafe(r.sector);
        r.direccion=normalizeAddressSafe(r.direccion);
        r.contacto=normalizeContactSafe(r.contacto);
        return r;
      }).filter(Boolean).filter(r=>Object.entries(r).some(([k,v])=>k!=='_txt'&&clean(v)));
    };
  }catch(e){console.warn('GS v150 no pudo reemplazar parseTxt',e)}

  try{
    if(typeof applyTxtRecord==='function'){
      const oldApply=applyTxtRecord;
      applyTxtRecord=function(rec){
        const importedDate=isoDate(rec?.fecha_registro||rec?.fecha_ro||rec?.Fecha_RO||'');
        const result=oldApply.apply(this,arguments);

        state.registration=state.registration||{};
        if(rec?.orden_ro) state.registration.orden_ro=clean(rec.orden_ro).replace(/\D/g,'').slice(0,10);
        if(importedDate) state.registration.fecha_registro=importedDate;

        // Marcas para que auditoría respete el origen del dato importado.
        state.registration.gs_fecha_origen=importedDate?'IMPORTADO_TXT':'';
        state.registration.gs_fecha_ro_original=importedDate||'';

        try{if(typeof renderRegistration==='function')renderRegistration()}catch(_){}
        try{
          const picker=document.getElementById('txtUserSelect');
          if(picker)picker.value=String(rec?._txt??'');
        }catch(_){}
        try{if(typeof save==='function')save()}catch(_){}
        return result;
      };
    }
  }catch(e){console.warn('GS v150 no pudo ajustar applyTxtRecord',e)}

  console.info('GS Documentos v150 · TXT 11 columnas + Fecha_RO activo');
})();