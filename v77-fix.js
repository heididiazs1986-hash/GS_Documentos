/* GS Documentos v77 - plantillas aprobadas + persistencia + generación estable */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V77_FIX__) return;
  globalThis.__GS_DOCS_V77_FIX__=true;

  const VERSION='v77';
  const APPLUS='APPLUS NORCONTROL COLOMBIA LTDA';
  const tplCache={};

  function log(...a){console.info('GS Documentos',VERSION,...a)}
  function warn(...a){console.warn('GS Documentos',VERSION,...a)}
  function cleanB64(s){return String(s||'').replace(/\s+/g,'')}

  async function fetchText(path){
    const r=await fetch(path+'?v=gsdoc-v77',{cache:'no-store'});
    if(!r.ok) throw new Error('No se pudo cargar '+path+' ('+r.status+')');
    return await r.text();
  }

  async function loadTemplate(name){
    if(tplCache[name]) return tplCache[name];
    let b64='';
    if(name==='E1'){
      const parts=[];
      for(let i=1;i<=13;i++){
        const p=String(i).padStart(2,'0');
        parts.push(cleanB64(await fetchText('./templates/base64/E1.part'+p+'.txt')));
      }
      b64=parts.join('');
    }else{
      const file=name==='EC'?'EC_APPLUS':name;
      b64=cleanB64(await fetchText('./templates/base64/'+file+'.txt'));
    }
    if(!b64 || b64.length<1000) throw new Error('Plantilla '+name+' vacía o incompleta');
    tplCache[name]=b64;
    return b64;
  }



  function gs77NormalizeAddress(raw){
    let s=String(raw||'').trim().toLocaleUpperCase('es-CO');
    if(!s)return '';

    // Uniformar signos usados como "número".
    s=s.replace(/N\s*[°º]\s*/g,' # ');
    s=s.replace(/\bNÚMERO\b\.?/g,' # ');
    s=s.replace(/\bNUMERO\b\.?/g,' # ');
    s=s.replace(/\bNRO\b\.?/g,' # ');
    s=s.replace(/\bNUM\b\.?/g,' # ');
    s=s.replace(/\bNO\.?\s*(?=\d)/g,' # ');

    const rules=[
      [/\b(CARRERA|CARR|CRA|KRA|KR)\b\.?/g,' KRA '],
      [/\b(CALLE|CLL|CL)\b\.?/g,' CL '],
      [/\b(MANZANA|MANZ|MZA|MZ)\b\.?/g,' MANZ '],
      [/\b(LOTE|LT)\b\.?/g,' LOTE '],
      [/\b(PISO|PIS|PSO)\b\.?/g,' PISO '],
      [/\b(CASA|CAS|CS)\b\.?/g,' CS '],
      [/\b(TRANSVERSAL|TRANSV|TVR|TRV|TV)\b\.?/g,' TRV '],
      [/\b(AVENIDA|AVDA|AVE|AV)\b\.?/g,' AV '],
      [/\b(VEREDA|VER|VDA)\b\.?/g,' VDA '],
      [/\b(BARRIO|BARR|BRR|BR)\b\.?/g,' BRR '],
      [/\b(SECTOR|SECT|SEC|STOR)\b\.?/g,' STOR '],
      [/\b(CIUDADELA|CDLA)\b\.?/g,' CDLA '],
      [/\b(UNIDAD|UNID|UND)\b\.?/g,' UND '],
      [/\b(APARTAMENTO|APART|APTO|APT|AP)\b\.?/g,' APTO ']
    ];
    for(const [re,to] of rules)s=s.replace(re,to);

    // Quitar separadores ambiguos y espaciar signos de nomenclatura.
    s=s.replace(/[;,]+/g,' ');
    s=s.replace(/\s*#\s*/g,' # ');
    s=s.replace(/\s*-\s*/g,' - ');
    s=s.replace(/\s*\/\s*/g,' / ');

    // Separar letras y números: 87P -> 87 P / A80 -> A 80.
    s=s.replace(/([A-ZÁÉÍÓÚÜÑ])(\d)/g,'$1 $2');
    s=s.replace(/(\d)([A-ZÁÉÍÓÚÜÑ])/g,'$1 $2');

    // Eliminar puntos residuales de abreviaturas y compactar espacios.
    s=s.replace(/\.\s*/g,' ');
    s=s.replace(/\s+/g,' ').trim();
    return s;
  }

  // Mantener compatibilidad con las funciones de la base.
  try{globalThis.normalizeAddress=gs77NormalizeAddress}catch(_){}

  function gs77TitleCase(s){
    try{return typeof titleCaseWords==='function'?titleCaseWords(s):String(s||'').trim().toLowerCase().replace(/(^|\\s)\\S/g,m=>m.toUpperCase())}
    catch(_){return String(s||'').trim()}
  }

  function gs77StartJornada(){
    const nameEl=document.getElementById('jornada_nombre');
    const nombre=String(nameEl?.value||'').trim();
    if(typeof records==='function' && records().length){
      alert('Hay una jornada anterior pendiente de exportar. Debes cerrarla antes de iniciar una nueva.');
      if(typeof show==='function')show('records');
      return;
    }
    if(!nombre){
      if(typeof toast==='function')toast('Escribe el nombre completo del técnico / gestor');
      nameEl?.focus();
      return;
    }
    state.jornada=state.jornada||{};
    state.jornada.active=true;
    state.jornada.tecnico_nombre=gs77TitleCase(nombre);
    state.jornada.nombre_tecnico=state.jornada.tecnico_nombre;
    state.jornada.tecnico_cedula='';
    state.jornada.cedula_tecnico='';
    state.jornada.inicio=new Date().toISOString();
    if(typeof save==='function')save();
    if(typeof show==='function')show('register');
    if(typeof toast==='function')toast('Jornada iniciada');
  }

  function gs77BindStart(){
    const n=document.getElementById('jornada_nombre');
    if(n){
      n.placeholder='Nombres y apellidos completos';
      const label=n.closest('.reg-field')?.querySelector('label');
      if(label)label.innerHTML='Nombre completo del técnico / gestor <span class="req">*</span>';
      if(n.dataset.gs77Name!=='1'){
        n.dataset.gs77Name='1';
        n.addEventListener('input',()=>{
          state.jornada=state.jornada||{};
          state.jornada.tecnico_nombre=n.value;
          state.jornada.nombre_tecnico=n.value;
          if(typeof save==='function')save();
          gs77ApplyRetieTech();
        });
      }
    }
    const ced=document.getElementById('jornada_cedula');
    if(ced){
      const host=ced.closest('.reg-field')||ced.parentElement;
      if(host)host.style.display='none';
      ced.required=false;
      ced.value='';
    }
    const b=document.getElementById('jornadaStart');
    if(b && b.dataset.gs77Bound!=='1'){
      const fresh=b.cloneNode(true);
      fresh.dataset.gs77Bound='1';
      b.replaceWith(fresh);
      fresh.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();gs77StartJornada()});
    }
  }

  function gs77TechName(){
    return gs77TitleCase(
      document.getElementById('jornada_nombre')?.value ||
      state.jornada?.tecnico_nombre ||
      state.jornada?.nombre_tecnico ||
      ''
    );
  }


  function gs78Profession(){
    return String(
      document.getElementById('retie_prof_constructor')?.value ||
      state.form?.retie_prof_constructor ||
      ''
    ).trim();
  }

  function gs77SerialFromMatricula(value,ced){
    let digits=String(value||'').replace(/\D/g,'');
    ced=String(ced||'').replace(/\D/g,'');
    if(ced){
      const ix=digits.indexOf(ced);
      if(ix>=0)digits=digits.slice(0,ix)+digits.slice(ix+ced.length);
    }
    return digits.slice(0,30);
  }

  function gs78FormatMatricula(serial,ced,prof){
    serial=String(serial||'').replace(/\D/g,'');
    ced=String(ced||'').replace(/\D/g,'');
    if(!ced)return serial;
    if(prof==='Tecnólogo electricista')return (serial?serial:'')+'-'+ced;
    return ced+'-'+(serial?serial:'');
  }

  function gs77SyncMatricula({keepSerial=true}={}){
    const id=document.getElementById('retie_const_identificacion');
    const mat=document.getElementById('cm_retie_matricula');
    if(!id||!mat)return;
    const ced=String(id.value||'').replace(/\D/g,'').slice(0,20);
    if(id.value!==ced)id.value=ced;
    const prof=gs78Profession();
    const serial=keepSerial?gs77SerialFromMatricula(mat.value,ced):'';
    const wanted=gs78FormatMatricula(serial,ced,prof);
    if(mat.value!==wanted)mat.value=wanted;
    mat.readOnly=false;
    mat.inputMode='numeric';
    mat.placeholder=prof==='Tecnólogo electricista'?'SERIE - CÉDULA':'CÉDULA - SERIE';
    state.jornada=state.jornada||{};
    state.form=state.form||{};
    state.jornada.tecnico_cedula=ced;
    state.jornada.cedula_tecnico=ced;
    state.form.retie_const_identificacion=ced;
    state.form.cm_retie_matricula=wanted;
    if(prof==='Técnico electricista')state.form.retie_consejo='CONTE';
    else if(prof==='Tecnólogo electricista')state.form.retie_consejo='CONALTEL';
    const consejo=document.getElementById('retie_consejo');
    if(consejo){consejo.value=state.form.retie_consejo||'';consejo.readOnly=true}
    if(typeof save==='function')save();
  }

  function gs77ApplyRetieTech(){
    const techName=gs77TechName();
    const name=document.getElementById('cm_retie_constructor');
    if(name){
      name.value=techName;
      name.readOnly=true;
      const lab=name.closest('.field,.reg-field')?.querySelector('label');
      if(lab)lab.textContent='Nombre del técnico / gestor *';
    }

    const id=document.getElementById('retie_const_identificacion');
    if(id){
      id.readOnly=false;
      id.inputMode='numeric';
      id.placeholder='Cédula del técnico';
      const lab=id.closest('.field,.reg-field')?.querySelector('label');
      if(lab)lab.textContent='Cédula del técnico *';
      if(id.dataset.gs78Bound!=='1'){
        id.dataset.gs78Bound='1';
        id.addEventListener('input',()=>{
          id.value=String(id.value||'').replace(/\D/g,'').slice(0,20);
          gs77SyncMatricula({keepSerial:true});
        });
      }
    }

    const prof=document.getElementById('retie_prof_constructor');
    if(prof && prof.dataset.gs78Bound!=='1'){
      prof.dataset.gs78Bound='1';
      prof.addEventListener('change',()=>{
        state.form=state.form||{};
        state.form.retie_prof_constructor=prof.value;
        try{if(typeof updateRetie==='function')updateRetie()}catch(_){}
        gs77SyncMatricula({keepSerial:true});
      });
    }

    const mat=document.getElementById('cm_retie_matricula');
    if(mat){
      const lab=mat.closest('.field,.reg-field')?.querySelector('label');
      if(lab)lab.textContent='Matrícula profesional *';
      if(mat.dataset.gs78Bound!=='1'){
        mat.dataset.gs78Bound='1';
        mat.addEventListener('focus',()=>{gs77SyncMatricula({keepSerial:true});try{mat.setSelectionRange(mat.value.length,mat.value.length)}catch(_){}});
        mat.addEventListener('input',()=>{
          gs77SyncMatricula({keepSerial:true});
          try{mat.setSelectionRange(mat.value.length,mat.value.length)}catch(_){}
        });
      }
      mat.parentElement?.querySelector('.gs77-mat-help')?.remove();
    }
    gs77SyncMatricula({keepSerial:true});
  }

  function gs77DecorateJornada(){
    gs77BindStart();
    const card=document.querySelector('#jornada .registration-card');
    if(!card)return;
    if(!document.getElementById('gs77-manual-style')){
      const st=document.createElement('style');st.id='gs77-manual-style';
      st.textContent=`
        #jornada .registration-card{border:1px solid #e2e2e3;border-radius:22px;background:#fefeff;box-shadow:0 12px 30px rgba(35,58,82,.08)}
        #jornada .gs77-start-banner{display:flex;align-items:center;gap:13px;border:1px solid #ffd2ba;background:linear-gradient(135deg,#fff3eb,#fff);border-radius:18px;padding:15px 16px;margin:0 0 16px}
        #jornada .gs77-start-icon{width:46px;height:46px;border-radius:15px;background:#ff6600;color:#fff;display:grid;place-items:center;font-size:22px;flex:0 0 auto}
        #jornada .gs77-start-banner b{display:block;color:#17385e;font:700 19px "Open Sans",system-ui}
        #jornada .gs77-start-banner span{color:#6a7b8d;font:500 13px Manrope,system-ui}
        #jornadaStart{background:#ff6600!important;border-color:#ff6600!important;color:white!important}
        .gs77-mat-help{display:block;margin-top:6px;color:#65778a;font:500 12px Manrope,system-ui;line-height:1.35}
        #cm_retie_constructor[readonly]{background:#f3f3f4!important;color:#35495e}
      `;document.head.appendChild(st);
    }

  }

  function forceApplus(){
    try{
      state.jornada=state.jornada||{};
      state.registration=state.registration||{};
      state.jornada.contrato='APPLUS';
      state.jornada.contratista=APPLUS;
      state.registration.contrato='APPLUS';
      state.registration.contratista=APPLUS;
      if(state.currentRecord){
        state.currentRecord.contrato='APPLUS';
        state.currentRecord.contratista=APPLUS;
      }
    }catch(e){warn('APPLUS',e)}
  }

  function hideContractor(){
    try{
      document.querySelectorAll('label,legend,.field-label,.reg-field label').forEach(el=>{
        if(!/contratista|aliado\s+estrat[eé]gico/i.test(el.textContent||'')) return;
        const host=el.closest('.reg-field,.field,.form-row,.input-group,.card-row')||el.parentElement;
        if(host) host.style.display='none';
      });
      document.querySelectorAll('[id],[name]').forEach(el=>{
        const k=((el.id||'')+' '+(el.getAttribute('name')||'')).toLowerCase();
        if(/contratista|selector.*aliado|aliado.*selector/.test(k)){
          const host=el.closest('.reg-field,.field,.form-row,.input-group')||el;
          host.style.display='none';
        }
      });
    }catch(e){warn('hideContractor',e)}
  }

  function bindIndependentGarrawall(){
    try{
      document.querySelectorAll('[data-seg]').forEach(seg=>{
        const key=seg.dataset.seg;
        if(key!=='garrawall'&&key!=='arriostre') return;
        seg.querySelectorAll('button').forEach(btn=>{
          if(btn.dataset.gsV77Independent==='1') return;
          const fresh=btn.cloneNode(true);
          fresh.dataset.gsV77Independent='1';
          btn.replaceWith(fresh);
          fresh.addEventListener('click',ev=>{
            ev.preventDefault();
            ev.stopImmediatePropagation();
            state.registration=state.registration||{};
            state.registration[key]=fresh.dataset.value;
            save();
            renderRegistration();
          });
        });
      });
    }catch(e){warn('Garrawall/arriostre',e)}
  }

  forceApplus();

  const PDF_MAPS={
    E1:{
      "1 Nombre o Razón Social":"cm_nombre",
      "3 Tipo documento":"cm_tipo_doc",
      "4 Número de Documento":"cm_num_doc",
      "5 Dirección de quien radica":"_direccion_sector",
      "6 MunicipioLocalidad":"cm_mpio",
      "7 departamento":"cm_depto",
      "8 Celular":"cm_celular",
      "10 Correo electrónico":"sol_correo",
      "3 Localidad":"cm_localidad",
      "4 Municipio":"cm_mpio",
      "5 departamento":"cm_depto",
      "6 Dirección del predio":"_direccion_sector",
      "Coordenada X":"e1_coord_x",
      "Coordenada Y":"e1_coord_y",
      "8 Indicaciones de acceso al predio":"e1_indicaciones",
      "2 Distancia actual del predio a la red más cercana metros":"e1_distancia_red",
      "3 Número de transformador poste o elemento de la red eléctrica más cercano":"e1_num_transformador",
      "1 Nombre del proyecto":"cm_nombre_proyecto",
      "2 Fecha de solicitud de servicio":"cm_fecha_ddmmaaaa",
      "Tipo de uso":"e1_tipo_uso",
      "Estrato":"e1_estrato",
      "No de solicitud":"_orden_ro_e1",
      "Red electrica cercana":"e1_red_cercana"
    },
    E6:{
      "text_1xogj":"cm_nombre_proyecto",
      "text_2gqcv":"_direccion_sector",
      "text_18ovuf":"cm_fecha_ddmmaaaa",
      "text_27bpxy":"cm_nombre",
      "text_30sznp":"_tecnico_nombre",
      "text_329o6m":"cm_celular",
      "text_19wprf":"e1_no_solicitud"
    },
    AR:{
      "text_1lojj":"ar_sector_pdf",
      "text_2tgsw":"ar_localidad_pdf",
      "text_3kjbx":"ar_alcaldia_pdf",
      "text_4mqvb":"_direccion_sola",
      "text_6prgm":"cm_nombre",
      "text_7jdiv":"cm_num_doc",
      "text_8ptdj":"cm_fecha_dia",
      "text_9ujpp":"cm_fecha_mes",
      "text_10ipyf":"cm_fecha_anio"
    },
    DJ:{
      "Nombre solicitante":"cm_nombre",
      "Identificacion":"cm_tipo_doc",
      "NumIdentificacion":"cm_num_doc",
      "Domicilio":"dj_ciudad_dom",
      "Direccion":"_direccion_sector",
      "Descripcion":"dj_descripcion",
      "Fechapropiedad":"dj_fecha_pose_ddmmaaaa",
      "LugarDom":"dj_ciudad_dom",
      "Posesion":"dj_posesion",
      "LugarFirma":"pred_mpio",
      "FechaFirma":"cm_fecha_ddmmaaaa",
      "Solicitante Firma":"cm_nombre"
    },
    RETIE:{
      "retie_constructor":"cm_retie_constructor",
      "retie_const_identificacion":"retie_const_identificacion",
      "text_4vafa":"retie_decl_num",
      "retie_prof_constructor":"retie_prof_constructor",
      "retie_matricula_const":"cm_retie_matricula",
      "retie_consejo":"retie_consejo",
      "retie_direccion":"_direccion_sola",
      "retie_municipio":"pred_mpio",
      "retie_departamento":"pred_depto",
      "retie_fecha_construccion":"retie_fecha_construccion_ddmmaaaa",
      "retie_solicitante":"cm_nombre",
      "retie_identificacion":"cm_num_doc",
      "retie_dia":"cm_fecha_dia",
      "retie_mes":"cm_fecha_mes",
      "retie_año":"cm_fecha_anio",
      "retie_ciudad":"retie_ciudad_firma",
      "retie_dir_constructor":"retie_dir_constructor",
      "retie_cel_constructor":"retie_cel_constructor",
      "retie_correo_constructor":"retie_correo_constructor"
    }
  };

  function appData(){
    const v={...(typeof data==='function'?data():(typeof recogerDatos==='function'?recogerDatos():{}))};
    const rec=state.currentRecord||state.registration||{};
    v._empresa=APPLUS; v._aliado=APPLUS; v._empresa_applus=APPLUS; v._empresa_inmel=APPLUS;
    const _dirSolo=gs77NormalizeAddress(rec.direccion||v.pred_direccion||v.cm_dir_radica||'');
    const _sector=String(rec.sector||v.cm_sector||'').trim().toLocaleUpperCase('es-CO');
    const _dirSector=[_dirSolo,_sector].filter(Boolean).join(' ');
    v._direccion_sola=_dirSolo;
    v._direccion_sector=_dirSector;
    v.pred_direccion=_dirSolo;
    v.ar_sector_pdf=v.ar_sector_pdf||rec.sector||v.cm_sector||'';
    v.ar_localidad_pdf=v.ar_localidad_pdf||rec.localidad||v.cm_localidad||'';
    v.ar_alcaldia_pdf=v.ar_alcaldia_pdf||v.cm_mpio||rec.municipio||rec.localidad||'';
    v._orden_ro_e1=String(rec.orden_ro||rec.Orden_RO||rec.ro||v.e1_no_solicitud||'').trim();
    const techName=gs77TechName();
    const retieId=String(document.getElementById('retie_const_identificacion')?.value||v.retie_const_identificacion||state.jornada?.tecnico_cedula||'').replace(/\\D/g,'');
    let mat=String(document.getElementById('cm_retie_matricula')?.value||v.cm_retie_matricula||'').trim();
    const prof=String(document.getElementById('retie_prof_constructor')?.value||v.retie_prof_constructor||state.form?.retie_prof_constructor||'').trim();
    if(retieId){
      const serial=gs77SerialFromMatricula(mat,retieId);
      mat=gs78FormatMatricula(serial,retieId,prof);
    }
    v.cm_retie_constructor=techName||v.cm_retie_constructor||'';
    v.retie_const_identificacion=retieId;
    v.retie_prof_constructor=prof;
    v.retie_consejo=prof==='Tecnólogo electricista'?'CONALTEL':(prof==='Técnico electricista'?'CONTE':(v.retie_consejo||''));
    v.cm_retie_matricula=mat;
    state.form=state.form||{};
    state.form.cm_retie_constructor=v.cm_retie_constructor;
    state.form.retie_const_identificacion=retieId;
    state.form.cm_retie_matricula=mat;
    v._tecnico_nombre=techName||state.jornada?.gestor_nombre||'';
    v._tecnico_cedula=retieId;
    return v;
  }

  function setFieldSafe(form,name,val,font){
    try{
      const f=form.getField(name);
      const s=sanitizePdfText?sanitizePdfText(val??''):String(val??'');
      if(typeof f.setText==='function') f.setText(s);
      else if(typeof f.select==='function' && s) f.select(s);
      else if(typeof f.check==='function') (s&&s!=='0'&&s.toLowerCase()!=='no'&&s!=='false')?f.check():f.uncheck();
      try{if(font&&typeof f.defaultUpdateAppearances==='function')f.defaultUpdateAppearances(font)}catch(_){}
      return true;
    }catch(_){return false}
  }

  async function fillPdf(name){
    const b64=await loadTemplate(name);
    const bytes=b64ToUint8?b64ToUint8(b64):base64ToBytes(b64);
    const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
    const form=pdf.getForm();
    const helv=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const vals=appData();
    const map=PDF_MAPS[name]||{};
    for(const [field,key] of Object.entries(map)) setFieldSafe(form,field,vals[key]??'',helv);

    if(name==='E1'){
      try{
        const rg=form.getRadioGroup("2 tipo persona"), val=vals.e1_tipo_persona;
        if(val){const opts=rg.getOptions();const idx=["Natural","Jurídica"].indexOf(val);if(idx>=0&&opts[idx])rg.select(opts[idx])}
      }catch(_){}
      try{
        const rg=form.getRadioGroup("1 zona"), val=vals.e1_zona;
        if(val){const opts=rg.getOptions();const idx=["Urbana","Rural"].indexOf(val);if(idx>=0&&opts[idx])rg.select(opts[idx])}
      }catch(_){}
    }

    try{form.updateFieldAppearances(helv)}catch(e){warn('apariencias '+name,e)}
    if(typeof insertPdfSignatures==='function') await insertPdfSignatures(pdf,name);
    else if(typeof aplicarFirmasPdf==='function') await aplicarFirmasPdf(pdf,name);

    return await pdf.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:false});
  }

  makePDF=async function(doc){return await fillPdf(doc)};

  async function makeECv77(){
    const b64=await loadTemplate('EC');
    const bytes=b64ToUint8?b64ToUint8(b64):base64ToBytes(b64);
    const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
    const form=pdf.getForm();
    const helv=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const vals=appData();
    const rec=state.currentRecord||state.registration||{};

    const ecMap={
      ec_fecha: vals.cm_fecha_ddmmaaaa||vals.cm_fecha_solicitud||rec.fecha_registro||'',
      ec_usuario: vals.cm_nombre||rec.nombres||'',
      ec_identificacion: vals.cm_num_doc||rec.identificacion||'',
      ec_direccion: vals._direccion_sector||vals.pred_direccion||rec.direccion||vals.cm_dir_radica||'',
      ec_municipio: vals.cm_mpio||rec.municipio||rec.localidad||'',
      ec_tecnico: vals.cm_retie_constructor||vals._tecnico_nombre||state.jornada?.tecnico_nombre||'',
      ec_matricula: vals.cm_retie_matricula||'',
      ec_tecnico_1: vals.cm_retie_constructor||vals._tecnico_nombre||state.jornada?.tecnico_nombre||'',
      ec_identificacion_tecnico: vals.retie_const_identificacion||vals._tecnico_cedula||state.jornada?.tecnico_cedula||'',
      ec_matricula_1: vals.cm_retie_matricula||''
    };
    for(const [field,val] of Object.entries(ecMap))setFieldSafe(form,field,val,helv);
    try{form.updateFieldAppearances(helv)}catch(e){warn('apariencias EC',e)}

    // Firma del técnico en el campo de firma de la página 8.
    const sig=state.signatures?.tecnico;
    if(sig){
      try{
        const img=await pdf.embedPng(dataUrlToUint8(sig));
        const page=pdf.getPages()[7];
        page.drawImage(img,fitImageRect(img,{x:55,y:160,width:268,height:52}));
      }catch(e){warn('firma EC',e)}
    }
    return await pdf.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:false});
  }
  makeEC=makeECv77;

  function setTextAny(form,names,val,helv,size){
    for(const name of names){
      try{
        const f=form.getTextField(name);
        try{f.acroField.dict.delete(PDFLib.PDFName.of('MaxLen'))}catch(_){}
        f.setText(sanitizePdfText?sanitizePdfText(val??''):String(val??''));
        if(size)try{f.setFontSize(size)}catch(_){}
        try{f.defaultUpdateAppearances(helv)}catch(_){}
        return true;
      }catch(_){}
    }
    return false;
  }
  function setCheckAny(form,names,on){
    for(const name of names){try{const f=form.getCheckBox(name);on?f.check():f.uncheck();return true}catch(_){}}
    return false;
  }
  function fitImageRect(img,box){
    const ir=img.width/img.height,br=box.width/box.height;let width=box.width,height=box.height;
    if(ir>br)height=width/ir;else width=height*ir;
    return{x:box.x+(box.width-width)/2,y:box.y+(box.height-height)/2,width,height};
  }

  makeTD=async function(recArg){
    const rec=recArg||state.currentRecord||state.registration||{};
    const b64=await loadTemplate('TD');
    const bytes=b64ToUint8?b64ToUint8(b64):base64ToBytes(b64);
    const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
    const form=pdf.getForm(), helv=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const hall=typeof tdHallazgos==='function'?tdHallazgos(rec):(rec.estado_tecnico||[]).join(' | ');

    setTextAny(form,['orden_ro'],rec.orden_ro,helv);
    setTextAny(form,['localidad'],rec.localidad,helv);
    setTextAny(form,['sector'],rec.sector,helv);
    setTextAny(form,['usuario','nombre'],rec.nombres,helv);
    setTextAny(form,['cedula','identificacion'],rec.identificacion,helv);
    setTextAny(form,['direccion'],rec.direccion,helv);
    setTextAny(form,['contacto'],rec.contacto,helv);
    setTextAny(form,['observaciones','hallazgos'],hall,helv,hall.length>420?7.5:(hall.length>260?8.5:10));

    const docs=rec.documentos_pendientes||[];
    const docMap=[
      [['checkbox_132o3x','docL0'],'Cédula del propietario'],
      [['checkbox_145n8r','docL1'],'Formato de solicitud (E1)'],
      [['checkbox_153e0d','docL2'],'Recibo técnico (E6)'],
      [['checkbox_163z1w','docL3'],'Doc. Electricista'],
      [['checkbox_176v2v','docM0'],'Aceptación de requisitos'],
      [['checkbox_189y7k','docM1'],'Declaración juramentada'],
      [['checkbox_190h1k','docM2'],'Esquema eléctrico'],
      [['checkbox_208g6g','docM3'],'RETIE']
    ];
    for(const [names,label] of docMap)setCheckAny(form,names,docs.includes(label));
    setCheckAny(form,['checkbox_216j8r','ec_particular'],rec.esquema_particular==='Sí');
    setCheckAny(form,['checkbox_222y0c','ec_contrato'],rec.esquema_particular!=='Sí');

    setTextAny(form,['text_232y0c','aut_nombre'],rec.nombres,helv);
    setTextAny(form,['text_245p3i','aut_identificacion'],rec.identificacion,helv);
    setTextAny(form,['text_275h9f','firma_usuario_nombre'],rec.nombres,helv);
    setTextAny(form,['text_289o8f','firma_usuario_cc'],rec.identificacion,helv);
    setTextAny(form,['text_291t9n','firma_tecnico_nombre'],state.jornada?.tecnico_nombre||'',helv);
    setTextAny(form,['text_301t3m','firma_tecnico_cc'],state.jornada?.tecnico_cedula||'',helv);
    setTextAny(form,['text_318x6q','fecha_registro'],rec.fecha_registro||'',helv);
    setTextAny(form,['text_331i7n','id_registro'],String(rec.id_registro||'').slice(0,16),helv);
    try{form.updateFieldAppearances(helv)}catch(e){warn('TD appearances',e)}

    const page=pdf.getPages()[0];
    for(const [kind,box] of Object.entries({solicitante:{x:29,y:91,width:238,height:63},tecnico:{x:304,y:92,width:239,height:63}})){
      const src=state.signatures?.[kind]; if(!src) continue;
      try{const img=await pdf.embedPng(dataUrlToUint8(src));page.drawImage(img,fitImageRect(img,box))}catch(e){warn('firma TD '+kind,e)}
    }
    return await pdf.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:false});
  };

  function cloneRecord(r){
    return {...r,
      elementos_externos:[...(r.elementos_externos||[])],
      estado_tecnico:[...(r.estado_tecnico||[])],
      documentos_pendientes:[...(r.documentos_pendientes||[])],
      condiciones_seguridad:[...(r.condiciones_seguridad||[])],
      contrato:'APPLUS',contratista:APPLUS
    };
  }

  saveRegistration=function(){
    try{
      forceApplus();
      if(!validateRegistration()) return false;
      const src=state.registration||{};
      src.nombres=titleCaseWords(src.nombres||'');
      src.sector=titleCaseWords(src.sector||'');
      src.direccion=gs77NormalizeAddress(src.direccion||'');
      src.contacto=cleanContact(src.contacto||'');
      const all=records();
      const roValue=String(src.orden_ro||'').trim();
      const dup=roValue?all.find(x=>String(x.orden_ro||'').trim()===roValue&&x.id_registro!==state.currentRecord?.id_registro):null;
      if(dup){alert('⚠️ Orden RO duplicada\n\nLa Orden RO '+roValue+' ya fue registrada.');state.regStep=0;renderRegistration();return false}
      const r=cloneRecord(src);
      r.id_registro=state.currentRecord?.id_registro||r.id_registro||makeUUID();
      r.fecha_hora_creacion=state.currentRecord?.fecha_hora_creacion||r.fecha_hora_creacion||new Date().toISOString();
      r.fecha_hora_actualizacion=new Date().toISOString();
      r.rol=state.role;r.estado_sync='PENDIENTE';
      const ix=all.findIndex(x=>x.id_registro===r.id_registro);
      if(ix>=0) all[ix]=r; else all.push(r);
      saveRecords(all);
      const verify=records();
      const stored=verify.find(x=>x.id_registro===r.id_registro);
      if(!stored) throw new Error('No fue posible verificar el registro guardado');
      state.currentRecord=stored;
      state.registration=cloneRecord(stored);
      applyRegistrationToDocs(stored);
      state.form=state.form||{};
      state.form.cm_fecha_solicitud=stored.fecha_registro||state.form.cm_fecha_solicitud||'';
      try{if(typeof updateRoleUI==='function')updateRoleUI()}catch(_){}
      document.querySelectorAll('.topnav .nav').forEach(b=>{b.classList.remove('locked');b.setAttribute('aria-disabled','false')});
      save();
      const ss=document.querySelector('#savedSummary');
      if(ss) ss.innerHTML=`<strong>${escapeText(stored.nombres)}</strong><br>RO: ${escapeText(stored.orden_ro||'—')}<br>${escapeText(stored.direccion)} · ${escapeText(stored.localidad)} / ${escapeText(stored.sector)}`;
      show('saved');toast('✅ Registro guardado correctamente');
      return true;
    }catch(e){console.error(e);toast('Error guardando registro: '+e.message);return false}
  };

  jornadaRows=function(){return [...records()].sort((a,b)=>String(a.fecha_hora_creacion||a.fecha_registro||'').localeCompare(String(b.fecha_hora_creacion||b.fecha_registro||'')))};

  const EXPORT_COLUMNS=[
    ['id_registro','ID registro'],['orden_ro','Orden RO'],['fecha_registro','Fecha de registro'],['fecha_hora_creacion','Fecha/hora creación'],
    ['nombres','Nombres'],['identificacion','Identificación'],['contacto','Contacto'],['direccion','Dirección'],['localidad','Localidad'],['sector','Sector/Barrio'],
    ['tipo_zona','Tipo zona'],['tipo_poblacion','Tipo de población'],['documento_propiedad','Documento de propiedad'],['documentos_pendientes','Documentos pendientes'],
    ['condiciones_seguridad','Condiciones de seguridad'],['esquema_particular','Esquema particular'],['esquema_contrato','Esquema contrato'],['requiere_redes','Requiere de redes'],
    ['tipo_material','Tipo material predio'],['plantas','Plantas'],['requiere_muro','Requiere muro/Pilar'],['garrawall','Requiere uso de Garrawall'],['arriostre','Requiere uso de arriostre'],
    ['requiere_interna','Requiere instalación interna'],['requiere_externa','Requiere instalación externa'],['elementos_externos','Elementos requeridos de instalación externa'],
    ['estado_tecnico','Estado técnico'],['observaciones','Observaciones'],['latitud','Latitud (Y)'],['longitud','Longitud (X)'],['precision','Precisión (m)'],['estado_sync','Estado sync']
  ];

  buildExcelBytes=function(rows){
    const known=new Set(EXPORT_COLUMNS.map(x=>x[0])),extra=[];
    for(const r of rows) for(const k of Object.keys(r||{})) if(!known.has(k)&&!['contrato','contratista'].includes(k)&&!extra.includes(k)) extra.push(k);
    const cols=[...EXPORT_COLUMNS,...extra.map(k=>[k,k])];
    const flat=rows.map(r=>Object.fromEntries(cols.map(([k,label])=>[label,Array.isArray(r[k])?r[k].join(' | '):(r[k]??'')])));
    const headers=cols.map(x=>x[1]),ws=XLSX.utils.json_to_sheet(flat,{header:headers});
    ws['!cols']=cols.map(([k,label])=>({wch:Math.min(55,Math.max(12,label.length+2,['observaciones','estado_tecnico','condiciones_seguridad','documentos_pendientes','elementos_externos'].includes(k)?42:18))}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Registros');
    return XLSX.write(wb,{bookType:'xlsx',type:'array'});
  };

  exportJornada=async function(){
    const rows=jornadaRows();
    if(!rows.length){toast('No hay registros para exportar');return false}
    const dup=duplicateROs(rows);if(dup.length){alert('⚠️ Orden RO duplicada\n\nCorrige antes de exportar:\n'+dup.join('\n'));return false}
    try{
      const sectors=rows.map(r=>r.sector).filter(Boolean),sectorName=sectors.length&&sectors.every(x=>x===sectors[0])?sectors[0]:'Varios_sectores';
      const safe=safeFilePart(sectorName),date=todayISO();
      await downloadBlob(new Blob([buildExcelBytes(rows)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`Recibo_tecnico_${safe}_${date}.xlsx`);
      const payload={app:'GS Documentos',version:VERSION,generated_at:new Date().toISOString(),total:rows.length,registros:rows.map(r=>typeof jsonRecord==='function'?jsonRecord(r):r)};
      await downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),`GS_Registro_${safe}_${date}.json`);
      localStorage.setItem('GS_DOCS_LAST_EXPORT_V1',new Date().toISOString());
      toast(`✅ Jornada exportada completa: ${rows.length} registros`);renderRecordsScreen();return true;
    }catch(e){console.error(e);toast('No fue posible exportar: '+e.message);return false}
  };

  closeJornada=async function(){
    const rows=jornadaRows();if(!rows.length)return toast('No hay registros para cerrar');
    const ok=await exportJornada();if(!ok)return;
    if(confirm('¿Confirmas que verificaste el Excel y el JSON descargados?\n\nAceptar limpiará los registros operativos del dispositivo.')){
      localStorage.removeItem(recordsKey);localStorage.removeItem(txtKey);localStorage.removeItem(appKey);toast('Jornada cerrada y datos operativos limpiados');setTimeout(()=>location.reload(),500);
    }
  };

  generateZip=async function(){
    try{
      forceApplus();
      const current=gs77EnsureCurrentRecord();
      if(!current){
        toast('Primero guarda el registro antes de generar documentos');
        show('register');
        return false;
      }
      const sel=(state.selected?.length?[...state.selected]:[]).filter(d=>d!=='TD');
      if(!validateRequired()){
        show('form');
        return false;
      }
      if(!state.signatures?.solicitante){
        toast('Falta la firma del usuario. No se puede descargar documentación sin esta firma');
        show('form');
        setTimeout(()=>document.getElementById('gs78Signatures')?.scrollIntoView({behavior:'smooth',block:'center'}),100);
        return false;
      }
      if(!state.signatures?.tecnico){
        toast('Falta la firma del técnico / gestor');
        show('form');
        setTimeout(()=>document.getElementById('gs78Signatures')?.scrollIntoView({behavior:'smooth',block:'center'}),100);
        return false;
      }

      const rec=current||state.registration||{};
      if(sel.includes('E1')){
        const ro=String(rec.orden_ro||rec.Orden_RO||rec.ro||appData().e1_no_solicitud||'').trim();
        if(!ro){
          toast('El E1 requiere Orden RO. Este dato llena “No de solicitud” en la página 2.');
          show('register');
          setTimeout(()=>document.getElementById('reg_ro')?.focus(),50);
          return false;
        }
      }

      updateKpis();
      const zip=new JSZip(),generated=[],errors=[];

      // TD is part of every documentary package.
      try{
        const tdName=typeof tdFileName==='function'?tdFileName(rec):'TD_Constancia_Inspeccion.pdf';
        const tdBytes=await makeTD(rec);
        if(!tdBytes||tdBytes.length<1000)throw new Error('archivo vacío');
        zip.file(tdName,tdBytes);generated.push('TD');
      }catch(e){errors.push('TD: '+(e?.message||e));warn('TD',e)}

      for(const d of sel){
        try{
          if(['E1','E6','AR','DJ','RETIE'].includes(d)){
            const bytes=await makePDF(d);
            if(!bytes||bytes.length<1000)throw new Error('archivo vacío');
            zip.file(d+'.pdf',bytes);generated.push(d);
          }else if(d==='EC'){
            const bytes=await makeECv77();
            if(!bytes||bytes.length<1000)throw new Error('archivo vacío');
            zip.file('EC_Esquema_constructivo.pdf',bytes);generated.push('EC');
          }
        }catch(e){
          errors.push(d+': '+(e?.message||e));
          warn(d,e);
        }
      }

      // Do NOT give the technician a misleading partial package.
      const missing=sel.filter(d=>!generated.includes(d));
      if(!generated.includes('TD'))missing.unshift('TD');
      if(missing.length){
        const msg='No se descargó el paquete porque falló la generación de: '+missing.join(', ')+
          (errors.length?'\n\nDetalle:\n'+errors.join('\n'):'');
        console.error(msg);
        alert(msg);
        toast('No se descargó un ZIP incompleto. Revisa los errores indicados');
        return false;
      }

      if(Object.values(state.materials?.qty||{}).some(q=>Number(q)>0)){
        try{zip.file('Materiales.xlsx',makeMaterials());generated.push('MATERIALES')}catch(e){errors.push('Materiales: '+(e?.message||e))}
      }
      if(state.supports?.length){
        const folder=zip.folder('SOPORTES');
        for(const f of state.supports){
          try{folder.file(f.name,await f.arrayBuffer())}catch(e){errors.push('Soporte '+f.name+': '+(e?.message||e))}
        }
        generated.push('SOPORTES ('+state.supports.length+')');
      }

      zip.file('CONTENIDO_PAQUETE.txt',
        'GS DOCUMENTOS '+VERSION+'\n'+
        'Usuario: '+String(rec.nombres||'')+'\n'+
        'RO: '+String(rec.orden_ro||'')+'\n'+
        'Generados: '+generated.join(', ')+'\n'+
        'Firma usuario: SI\nFirma técnico/gestor: SI\n'
      );
      if(errors.length)zip.file('ADVERTENCIAS_GENERACION.txt',errors.join('\n'));

      const blob=await zip.generateAsync({type:'blob'});
      const name=cleanName(appData().cm_nombre||rec.nombres||'GS_Documentos')+'.zip';
      await downloadBlob(blob,name);
      toast('✅ Paquete completo generado: '+generated.join(', '),7000);
      return true;
    }catch(e){
      console.error(e);
      alert('Error generando documentos: '+(e?.message||e));
      toast('Error generando: '+(e?.message||e));
      return false;
    }
  };


  function gs77FixTxtAndRoSafe(){
    try{
      if(typeof parseTxt==='function' && !globalThis.__GS77_TXT_PARSER_SAFE__){
        globalThis.__GS77_TXT_PARSER_SAFE__=true;
        parseTxt=function(text){
          const clean=String(text||'').replace(/^\uFEFF/,'').replace(/\r/g,'');
          const lines=clean.split('\n').filter(x=>x.trim());
          if(lines.length<2)return[];
          const headRaw=splitLine(lines[0],'|'), head=headRaw.map(canonHeader);
          if(headRaw.length!==10)throw new Error('El TXT debe tener exactamente 10 columnas separadas por |');
          const defs=[
            ['orden_ro',['ro/orden','ro orden','orden ro','ro','orden']],
            ['nombres',['nombres','nombre']],
            ['identificacion',['identificacion']],
            ['contacto',['contacto']],
            ['direccion',['direccion']],
            ['localidad',['localidad']],
            ['sector',['sector/barrio','sector barrio']],
            ['tipo_zona',['tipo zona']],
            ['latitud',['latitud','latitud y']],
            ['longitud',['longitud','longitud x']]
          ];
          const index={};
          for(const [key,aliases] of defs){
            const norm=aliases.map(canonHeader);
            const i=head.findIndex(h=>norm.includes(h));
            if(i<0)throw new Error('Falta la columna '+key);
            index[key]=i;
          }
          return lines.slice(1).map((line,n)=>{
            const cols=splitLine(line,'|');
            if(cols.length!==10)return null;
            const r={_txt:n+1};
            for(const [k,i] of Object.entries(index))r[k]=cols[i]||'';
            r.orden_ro=String(r.orden_ro||'').replace(/\D/g,'').slice(0,10);
            r.nombres=titleCaseWords(r.nombres);
            r.sector=titleCaseWords(r.sector);
            r.direccion=gs77NormalizeAddress(r.direccion);
            r.contacto=normalizeContact(r.contacto);
            return r;
          }).filter(Boolean).filter(r=>Object.entries(r).some(([k,v])=>k!=='_txt'&&String(v||'').trim()));
        };
      }
      if(typeof applyTxtRecord==='function' && !globalThis.__GS77_TXT_APPLY_SAFE__){
        globalThis.__GS77_TXT_APPLY_SAFE__=true;
        applyTxtRecord=function(rec){
          const allowed=['orden_ro','nombres','identificacion','contacto','direccion','localidad','sector','tipo_zona','latitud','longitud'];
          const next={...state.registration,fecha_registro:state.registration.fecha_registro||''};
          for(const k of allowed){if(rec[k]!==undefined&&rec[k]!==null)next[k]=rec[k]}
          if(!Array.isArray(next.elementos_externos))next.elementos_externos=[];
          if(!Array.isArray(next.estado_tecnico))next.estado_tecnico=[];
          state.registration=next;
          renderRegistration();
          save();
          toast('Datos del TXT cargados. Puedes editarlos');
        };
      }
      if(typeof validateStep==='function' && !globalThis.__GS77_RO_OPTIONAL_SAFE__){
        globalThis.__GS77_RO_OPTIONAL_SAFE__=true;
        const originalValidateStep=validateStep;
        validateStep=function(step){
          if(step!==0)return originalValidateStep(step);
          const r=state.registration||{},miss=[];
          const ro=String(r.orden_ro||'').trim();
          if(ro&&!/^\d{10}$/.test(ro)){alert('⚠️ Orden RO inválida\n\nSi diligencias la Orden RO, debe contener exactamente 10 dígitos.');return false}
          if(ro&&records().some(x=>x.orden_ro===ro&&x.id_registro!==state.currentRecord?.id_registro)){alert('⚠️ Orden RO duplicada\n\nLa Orden RO '+ro+' ya fue registrada en esta jornada.');return false}
          if(!String(r.fecha_registro||'').trim())miss.push('Fecha de registro');
          if(!r.nombres)miss.push('Nombres');
          if(!r.identificacion)miss.push('Identificación');
          if(!r.contacto||countContactDigits(r.contacto)<1)miss.push('Contacto');
          [['direccion','Dirección'],['municipio','Municipio'],['sector','Sector/Barrio'],['tipo_zona','Tipo Zona'],['tipo_poblacion','Tipo de población'],['documento_propiedad','Documento de propiedad']].forEach(([k,l])=>{if(!String(r[k]||'').trim())miss.push(l)});
          if(r.municipio==='Bogotá'&&!String(r.localidad||'').trim())miss.push('Localidad');
          if(miss.length){toast('Faltan: '+miss.slice(0,3).join(', '));return false}
          return true;
        };
      }
      const ro=document.getElementById('reg_ro');
      if(ro){
        ro.placeholder='10 dígitos si aplica';
        const lab=ro.closest('.reg-field')?.querySelector('label');
        if(lab&&lab.dataset.gs77RoOptional!=='1'){
          lab.dataset.gs77RoOptional='1';
          lab.innerHTML='Orden RO <span style="font-weight:500;color:#6f7f90">(opcional)</span>';
        }
      }
    }catch(e){warn('TXT/RO safe',e)}
  }


  function gs77EnsureCurrentRecord(){
    try{
      if(state.currentRecord?.id_registro)return state.currentRecord;
      const id=state.registration?.id_registro||state.editingRecordId;
      if(id){
        const hit=records().find(r=>r.id_registro===id);
        if(hit){state.currentRecord={...hit};return state.currentRecord}
      }
      const ro=String(state.registration?.orden_ro||'').trim();
      const idn=String(state.registration?.identificacion||'').trim();
      const hit=[...records()].reverse().find(r=>(ro&&String(r.orden_ro||'')===ro)||(idn&&String(r.identificacion||'')===idn));
      if(hit){state.currentRecord={...hit};state.registration={...hit};return state.currentRecord}
    }catch(e){warn('rehidratar registro',e)}
    return null;
  }

  function gs77BindSupports(){
    const input=document.getElementById('supportInput');
    if(input && input.dataset.gs77Bound!=='1'){
      input.dataset.gs77Bound='1';
      input.onchange=e=>{
        state.supports=[...(e.target.files||[])];
        if(typeof renderSupports==='function')renderSupports();
        if(typeof toast==='function')toast(state.supports.length?('✅ '+state.supports.length+' soporte(s) cargado(s)'):'Sin soportes cargados');
      };
    }
    const card=document.querySelector('#supports .card');
    if(card && !document.getElementById('gs77ToSignatures')){
      const actions=card.querySelector('.actions')||card;
      const b=document.createElement('button');
      b.id='gs77ToSignatures';b.type='button';b.className='btn';
      b.textContent='Continuar a firmas →';
      b.onclick=()=>{gs77EnsureCurrentRecord();show('signatures')};
      actions.prepend(b);
    }
  }

  function gs77BindSignatureFlow(){
    try{
      // Permitir corregir/capturar firma del usuario aunque exista una exportación previa.
      if(typeof signatureLocked==='function')signatureLocked=function(){return false};
    }catch(_){}
    if(typeof renderSignatures==='function'){
      try{renderSignatures()}catch(_){}
    }
    const card=document.querySelector('#signatures .card');
    if(card && !document.getElementById('gs77ToGenerate')){
      const actions=card.querySelector('.actions')||card;
      const b=document.createElement('button');
      b.id='gs77ToGenerate';b.type='button';b.className='btn';
      b.textContent='Continuar a generar →';
      b.onclick=()=>{
        if(!state.signatures?.solicitante){toast('Falta la firma del usuario');return}
        if(!state.signatures?.tecnico){toast('Falta la firma del técnico / gestor');return}
        show('generate');
      };
      actions.prepend(b);
    }
  }

  function gs77HasEC(){
    try{
      if(Array.isArray(state.selected)&&state.selected.includes('EC'))return true;
      if(Array.isArray(state.docs)&&state.docs.includes('EC'))return true;
      if(typeof hasDoc==='function'&&hasDoc('EC'))return true;
    }catch(_){}
    return false;
  }

  function gs77RemoveECLoadControls(){
    if(!gs77HasEC())return;
    const root=document.getElementById('form')||document;
    root.querySelectorAll('button').forEach(b=>{
      if(/diligenciar\s+cuadro\s+de\s+cargas/i.test(b.textContent||''))b.style.display='none';
    });
    root.querySelectorAll('.section,.card,.subcard,div').forEach(el=>{
      const h=el.querySelector(':scope > .section-head h2,:scope > h2,:scope > h3');
      const title=(h?.textContent||'').trim();
      if(/^cuadro\s+de\s+cargas$/i.test(title))el.style.display='none';
    });
    ['loadListInline','loadSummaryInline','saveLoadsInline','ecCargaResumen','loadList','loadSummary'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.display='none';
    });
  }

  function gs77EnsureECEditableFields(){
    if(!gs77HasEC())return;
    const formRoot=document.getElementById('formHost')||document.getElementById('form')||document;
    let id=document.getElementById('retie_const_identificacion');
    const mat=document.getElementById('cm_retie_matricula');
    if(!id && mat){
      const matField=mat.closest('.field,.reg-field');
      const host=matField?.parentElement;
      if(host){
        const wrap=document.createElement('div');
        wrap.className=matField.className||'field';
        wrap.innerHTML='<label>Identificación del técnico <span class="req">*</span></label><input id="retie_const_identificacion" type="text" inputmode="numeric" placeholder="Cédula del técnico">';
        host.insertBefore(wrap,matField);
        id=wrap.querySelector('input');
      }
    }
    if(id){
      id.value=String(state.form?.retie_const_identificacion||state.jornada?.tecnico_cedula||id.value||'').replace(/\D/g,'').slice(0,20);
      if(id.dataset.gs77EcId!=='1'){
        id.dataset.gs77EcId='1';
        id.addEventListener('input',()=>{
          id.value=String(id.value||'').replace(/\D/g,'').slice(0,20);
          state.form=state.form||{};
          state.form.retie_const_identificacion=id.value;
          gs77SyncMatricula({keepSerial:true});
          if(typeof save==='function')save();
        });
      }
    }
    gs77ApplyRetieTech();
    gs77RemoveECLoadControls();
  }

  let gs77RegistrationRef=null;
  let gs77DateTouched=false;

  function gs77BindAddressRule(){
    const el=document.getElementById('reg_direccion');
    if(!el||el.dataset.gs77AddressRule==='1')return;
    el.dataset.gs77AddressRule='1';
    const apply=()=>{
      const v=gs77NormalizeAddress(el.value);
      el.value=v;
      state.registration=state.registration||{};
      state.registration.direccion=v;
      if(typeof save==='function')save();
    };
    el.addEventListener('blur',apply);
    el.addEventListener('change',apply);
  }

  function gs77BindRegistrationDate(){
    const reg=state.registration||{};
    if(gs77RegistrationRef!==reg){
      gs77RegistrationRef=reg;
      gs77DateTouched=!!state.currentRecord?.id_registro;
    }
    const root=document.getElementById('register');
    if(!root)return;
    const label=[...root.querySelectorAll('label')].find(x=>/^fecha\s+de\s+registro/i.test((x.textContent||'').trim()));
    const host=label?.closest('.reg-field,.field')||label?.parentElement;
    const input=host?.querySelector('input');
    if(!input)return;
    input.type='date';
    input.readOnly=false;
    input.disabled=false;
    input.removeAttribute('readonly');
    input.removeAttribute('disabled');
    host?.querySelectorAll('button,span,small').forEach(x=>{
      if(/autom[aá]tica/i.test(x.textContent||''))x.style.display='none';
    });
    if(!state.currentRecord?.id_registro && !gs77DateTouched && String(reg.fecha_registro||input.value||'')===todayISO()){
      reg.fecha_registro='';
      input.value='';
      if(typeof save==='function')save();
    }else if(reg.fecha_registro){
      input.value=reg.fecha_registro;
    }
    if(input.dataset.gs77Date!=='1'){
      input.dataset.gs77Date='1';
      const sync=()=>{
        gs77DateTouched=true;
        state.registration=state.registration||{};
        state.registration.fecha_registro=input.value||'';
        if(typeof save==='function')save();
      };
      input.addEventListener('input',sync);
      input.addEventListener('change',sync);
    }
  }

  function gs77BindFormFlow(){
    // RETIE se renderiza dentro de #formHost, por eso hay que aplicar la lógica DESPUÉS de renderForm().
    gs77ApplyRetieTech();
    gs77EnsureECEditableFields();
    gs77RemoveECLoadControls();
    const direct=document.querySelector('#form .actions [data-go="generate"]');
    if(direct && direct.dataset.gs77Flow!=='1'){
      direct.dataset.gs77Flow='1';
      direct.textContent='Continuar a soportes →';
      direct.onclick=ev=>{ev.preventDefault();ev.stopImmediatePropagation();gs77EnsureCurrentRecord();show('supports')};
    }
  }

  function gs77UpdateNavLocks(){
    const has=!!gs77EnsureCurrentRecord();
    document.querySelectorAll('[data-go="supports"],[data-go="signatures"],[data-go="generate"]').forEach(b=>{
      b.classList.toggle('locked',!has);
      b.setAttribute('aria-disabled',has?'false':'true');
    });
  }

  function gs77PrepareDocumentScreen(id){
    gs77EnsureCurrentRecord();
    if(id==='form')gs77BindFormFlow();
    if(id==='supports')gs77BindSupports();
    if(id==='signatures')gs77BindSignatureFlow();
    gs77UpdateNavLocks();
  }

  try{
    const gs77OriginalShow=show;
    show=function(id){
      if(id==='signatures')id='form';
      if(['home','form','supports','generate'].includes(id))gs77EnsureCurrentRecord();
      const out=gs77OriginalShow(id);
      setTimeout(()=>{gs77PrepareDocumentScreen(id);gs78ApplyVisuals();if(id==='generate')gs78DecorateGenerate()},0);
      return out;
    };
  }catch(e){warn('show flow',e)}


  const GS78_DOCS=[
    ['E1','Formato de solicitud de servicio'],
    ['E6','Formato de recibo técnico'],
    ['AR','Acta de aceptación de requisitos y condiciones para la normalización del servicio'],
    ['DJ','Declaración juramentada simple'],
    ['RETIE','Declaración de cumplimiento de la construcción RES. 40117 de 02/04/2024'],
    ['EC','Diseño eléctrico simplificado'],
    ['TD','Formato de aceptación de tratamiento de datos conforme a legislación colombiana']
  ];

  function gs78InjectStyles(){
    let st=document.getElementById('gs78-ui');
    if(!st){st=document.createElement('style');st.id='gs78-ui';document.head.appendChild(st)}
    st.textContent=`
      :root{
        --gs-surface:#f9f9fa;
        --gs-surface-dim:#d9dadb;
        --gs-surface-bright:#f9f9fa;
        --gs-surface-lowest:#ffffff;
        --gs-surface-low:#f3f3f4;
        --gs-surface-container:#edeeef;
        --gs-surface-high:#e8e8e9;
        --gs-surface-highest:#e2e2e3;
        --gs-on-surface:#1a1c1d;
        --gs-on-surface-variant:#5a4136;
        --gs-outline:#8e7164;
        --gs-outline-variant:#e3bfb1;
        --gs-primary:#a33e00;
        --gs-primary-container:#ff6600;
        --gs-on-primary:#ffffff;
        --gs-primary-fixed:#ffdbcd;
        --gs-secondary:#595f65;
        --gs-secondary-container:#dae0e7;
        --gs-secondary-fixed:#dde3ea;
        --gs-secondary-fixed-dim:#c1c7ce;
        --gs-tertiary:#006689;
        --gs-tertiary-container:#43a0cc;
        --gs-tertiary-fixed:#c3e8ff;
        --gs-tertiary-fixed-dim:#79d1ff;
        --gs-error:#ba1a1a;
        --gs-green:#2e8b62;
        --gs-shadow:0 6px 16px rgba(48,54,59,.07);
        --gs-shadow-pop:0 16px 34px rgba(48,54,59,.14);
      }

      *{box-sizing:border-box}
      html,body{background:var(--gs-surface)!important}
      body{
        margin:0!important;
        color:var(--gs-on-surface)!important;
        background:var(--gs-surface)!important;
        font-family:Manrope,"Segoe UI",Arial,sans-serif!important;
        font-weight:400!important;
      }

      .top{
        position:sticky!important;top:0;z-index:40;
        background:rgba(255,255,255,.98)!important;
        border:0!important;border-bottom:1px solid #e6e7e8!important;
        box-shadow:0 2px 8px rgba(45,50,54,.04)!important;
        backdrop-filter:blur(10px);
      }
      .top:after{
        content:"";display:block;height:4px;
        background:linear-gradient(90deg,var(--gs-primary-container) 0 52%,var(--gs-tertiary-fixed-dim) 52% 74%,var(--gs-secondary-fixed-dim) 74% 100%);
      }
      .head{max-width:1180px!important;padding:10px 20px 6px!important}
      .title{
        font-family:"Open Sans","Segoe UI",Arial,sans-serif!important;
        color:#103b69!important;font-weight:700!important;
        letter-spacing:-.02em!important;font-size:20px!important
      }
      .sub{color:#75818c!important;font-size:12px!important}
      .topnav{
        max-width:1180px!important;gap:2px!important;padding:0 20px 9px!important
      }
      .topnav .nav{
        min-height:42px!important;border:0!important;border-radius:12px!important;
        color:#66727e!important;padding:9px 12px!important;
        font-weight:600!important;background:transparent!important
      }
      .topnav .nav:hover{background:var(--gs-surface-low)!important;color:#243543!important}
      .topnav .nav.active{
        color:#103b69!important;background:#fff!important;
        box-shadow:inset 0 -3px 0 var(--gs-tertiary-fixed-dim)!important
      }
      .topnav .nav.active:after{display:none!important}
      .topnav .nav[data-go="signatures"]{display:none!important}

      #app{
        max-width:1180px!important;margin:0 auto!important;
        padding:24px 24px 40px!important
      }

      .screen>.card,.registration-card,.decision-card{
        border:1px solid #dfe0e1!important;
        border-radius:16px!important;background:var(--gs-surface-lowest)!important;
        box-shadow:none!important;padding:24px!important
      }

      h1,h2,h3,.reg-step-title,.section-title{
        font-family:"Open Sans","Segoe UI",Arial,sans-serif!important;
        color:#103b69!important;font-weight:700!important;letter-spacing:-.02em!important
      }
      h2{font-size:24px!important;line-height:1.2!important}
      h3{font-size:17px!important}
      .help{color:#6e7882!important;line-height:1.45!important}

      .reg-progressbar{
        height:6px!important;background:var(--gs-surface-container)!important;
        border-radius:9999px!important;overflow:hidden!important;margin-bottom:18px!important
      }
      .reg-progressbar span{
        background:var(--gs-primary-container)!important;border-radius:9999px!important
      }

      .reg-field,.field{background:transparent!important}
      .reg-field label,.field label{
        display:block!important;color:#34485a!important;
        font-family:Manrope,"Segoe UI",Arial,sans-serif!important;
        font-weight:600!important;font-size:14px!important;
        line-height:20px!important;margin-bottom:6px!important
      }

      input,select,textarea,.auto-value,.multi-trigger{
        width:100%;
        border:1px solid #cfd3d6!important;border-radius:16px!important;
        background:#fff!important;color:#202d37!important;
        min-height:48px!important;padding:10px 16px!important;
        box-shadow:none!important;font-size:15px!important
      }
      input:hover,select:hover,textarea:hover,.multi-trigger:hover{border-color:#adb4ba!important}
      input:focus,select:focus,textarea:focus,.multi-trigger:focus{
        border-color:var(--gs-primary-container)!important;
        box-shadow:0 0 0 3px rgba(255,102,0,.18)!important;
        outline:none!important;background:#fff!important
      }
      input[readonly],.auto-value[readonly]{
        background:var(--gs-surface-low)!important;color:#66727e!important
      }
      textarea{min-height:112px!important}

      .btn{
        min-height:44px!important;border-radius:16px!important;
        padding:0 18px!important;font-family:Manrope,"Segoe UI",Arial,sans-serif!important;
        font-weight:600!important;letter-spacing:.01em!important
      }
      .btn:not(.secondary):not(.ghost):not(.outline){
        background:var(--gs-primary-container)!important;color:#fff!important;
        border:1px solid var(--gs-primary-container)!important;
        box-shadow:none!important
      }
      .btn:not(.secondary):not(.ghost):not(.outline):hover{
        background:#e65100!important;border-color:#e65100!important;transform:none!important
      }
      .btn.secondary{
        background:var(--gs-secondary-fixed-dim)!important;color:#1f252a!important;
        border:1px solid var(--gs-secondary-fixed-dim)!important;box-shadow:none!important
      }
      .btn.ghost,.btn.outline{
        background:transparent!important;color:#3e4a54!important;
        border:1.5px solid #aeb5bb!important;box-shadow:none!important
      }

      .seg{
        background:var(--gs-surface-low)!important;border:1px solid #d6d8da!important;
        border-radius:16px!important;padding:4px!important
      }
      .seg button{
        min-height:40px!important;border-radius:12px!important;color:#5b6670!important;
        font-weight:600!important
      }
      .seg button.active{
        background:var(--gs-primary-container)!important;color:#fff!important;
        border-color:var(--gs-primary-container)!important;box-shadow:none!important
      }

      .multi-menu{
        border-radius:16px!important;border:1px solid #cfd3d6!important;
        box-shadow:var(--gs-shadow-pop)!important;background:#fff!important
      }
      .tech-option,.multi-option{border-radius:12px!important}

      #home>.card{max-width:760px;margin:0 auto}
      #docGrid.gs78-doc-grid{display:grid!important;gap:10px!important}

      .gs80-doc-toolbar{
        display:flex;align-items:center;justify-content:space-between;
        gap:12px;margin:4px 0 14px
      }
      .gs80-doc-note{font-size:13px;color:#626d76;line-height:1.4}
      .gs80-all-docs{min-height:44px!important;white-space:nowrap}
      .gs80-mandatory{
        justify-self:end;display:inline-flex;align-items:center;gap:6px;
        padding:5px 10px;border-radius:9999px;
        background:#e9f5ef;color:#246b4c;font-size:11px;font-weight:600;
        border:1px solid #cbe4d5
      }
      .gs80-mandatory:before{content:"✓";font-size:12px}

      .gs78-doc{
        width:100%;display:grid;grid-template-columns:44px minmax(0,1fr) 48px;
        align-items:center;gap:12px;text-align:left;
        border:1px solid #dfe2e4;background:#fff;
        border-radius:16px;padding:12px 14px;cursor:pointer;
        transition:.15s ease;box-shadow:none
      }
      .gs78-doc:hover{border-color:#b8bec3;background:#fdfdfd}
      .gs78-doc .gs78-doc-icon{
        width:44px;height:44px;border-radius:12px;
        background:#fff3ec;display:grid;place-items:center;
        color:var(--gs-primary-container);font-size:20px;font-weight:700;
        border:1px solid #ffd8c3
      }
      .gs78-doc strong{
        display:block;color:#173f68;font-size:15px;font-weight:700;margin-bottom:2px
      }
      .gs78-doc small{
        display:block;color:#727d86;font-size:12px;line-height:1.35
      }
      .gs78-doc.required{cursor:default}

      .gs78-switch{
        width:44px;height:24px;border-radius:9999px;background:#cfd2d4;
        padding:2px;display:flex;align-items:center;justify-content:flex-start;
        transition:.15s ease
      }
      .gs78-switch:after{
        content:"";width:20px;height:20px;border-radius:50%;background:#fff;
        box-shadow:0 1px 4px rgba(0,0,0,.18)
      }
      .gs78-doc.on .gs78-switch{
        background:var(--gs-primary-container);justify-content:flex-end
      }

      #jornada{padding-top:2px}
      .gs78-start{
        max-width:560px;margin:0 auto;overflow:hidden;padding:0!important;
        border-radius:16px!important
      }
      .gs78-hero{
        position:relative;height:200px;overflow:hidden;
        background:linear-gradient(180deg,#eef7fb,#f7fbfd)
      }
      .gs78-hero:after{display:none!important}
      .gs78-hero img{
        width:100%;height:100%;object-fit:cover;object-position:center 42%;
        filter:saturate(.94) contrast(.98)
      }
      .gs78-brand{
        position:absolute;left:18px;bottom:16px;
        background:rgba(255,255,255,.96);border:1px solid #e0e2e4;
        border-radius:16px;padding:10px 14px;box-shadow:var(--gs-shadow)
      }
      .gs78-brand b{
        font-family:"Open Sans","Segoe UI",Arial,sans-serif!important;
        font-size:22px;color:#103b69;font-weight:700
      }
      .gs78-brand span{display:block;color:#707b84;font-size:12px;margin-top:2px}
      .gs78-start-body{padding:22px}
      .gs78-start-body h2{margin:0 0 16px}
      .gs78-start-body .reg-grid{display:block!important}
      .gs78-start-body .reg-field{margin-bottom:12px}
      .gs78-start-body .actions{margin-top:12px}
      .gs78-start-body #jornadaStart{width:100%}
      #jornada .gs77-start-banner,#jornada .gs77-mini,#jornadaFirma,#jornadaFirmaStatus{display:none!important}

      #form>.card,#supports>.card,#generate>.card{max-width:840px;margin:0 auto}
      #formHost>.section,.form-section,.reg-section{
        border:1px solid #dfe2e4!important;border-radius:16px!important;
        background:#fff!important;padding:16px!important;margin-bottom:14px!important;
        box-shadow:none!important
      }
      #formHost>.section>h3,.form-section>h3,.reg-section>h3{
        margin-top:0!important;padding-bottom:10px!important;
        border-bottom:1px solid #eceeef!important
      }

      .gs78-signatures{
        margin-top:18px;border-top:1px solid #e2e4e6;padding-top:18px
      }
      .gs78-signatures h3{margin:0 0 12px}
      .gs78-sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .gs78-sign-card{
        border:1px solid #dfe2e4;border-radius:16px;background:#fff;
        padding:14px;box-shadow:none
      }
      .gs78-sign-card b{display:block;color:#173f68;margin-bottom:8px;font-weight:600}
      .gs78-sign-preview{
        height:92px;border:1px dashed #bfc5ca;border-radius:12px;
        background:var(--gs-surface-low);display:flex;align-items:center;justify-content:center;
        overflow:hidden;color:#7b858e;font-size:12px
      }
      .gs78-sign-preview img{max-width:100%;max-height:100%;object-fit:contain}
      .gs78-sign-card .btn{width:100%;margin-top:9px;min-height:42px!important}

      .gs78-review{display:grid;gap:12px;margin:16px 0}
      .gs78-review-box{
        border:1px solid #dfe2e4;border-radius:16px;padding:16px;background:#fff;box-shadow:none
      }
      .gs78-review-box h3{margin:0 0 9px;font-size:15px}
      .gs78-review-list{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px
      }
      .gs78-ok{color:var(--gs-green);font-weight:600}
      .gs78-pending{color:#9c4d00;font-weight:600}
      #generate .help{display:none!important}
      #genZip{font-size:15px!important}
      .preview img{border-radius:12px!important}
      .toast{border-radius:16px!important}

      body.dark{background:#181a1c!important}
      .dark .top{background:rgba(31,33,35,.98)!important;border-color:#3c4043!important}
      .dark .screen>.card,.dark .registration-card,.dark .decision-card,
      .dark .gs78-doc,.dark .gs78-sign-card,.dark .gs78-review-box,.dark #formHost>.section{
        background:#222527!important;border-color:#3d4246!important
      }
      .dark input,.dark select,.dark textarea,.dark .auto-value,.dark .multi-trigger{
        background:#1d2022!important;border-color:#4b5054!important;color:#f0f1f2!important
      }
      .dark h2,.dark h3,.dark .reg-step-title,.dark .section-title,
      .dark .gs78-doc strong,.dark .gs78-sign-card b,.dark .gs78-review-box h3{
        color:#f4f7fa!important
      }

      @media(min-width:1200px){
        .registration-card .reg-grid,
        #formHost .reg-grid,
        #formHost .grid{
          gap:16px 24px!important
        }
      }

      @media(max-width:700px){
        #app{padding:12px 12px 28px!important}
        .screen>.card,.registration-card{border-radius:16px!important;padding:16px!important}
        .gs78-hero{height:185px}
        .gs78-sign-grid{grid-template-columns:1fr}
        .gs78-review-list{grid-template-columns:1fr}
        .topnav{
          overflow-x:auto;white-space:nowrap;padding-left:12px!important;padding-right:12px!important
        }
        .topnav .nav{flex:0 0 auto}
        .reg-grid{grid-template-columns:1fr!important}
        .gs78-doc{grid-template-columns:42px minmax(0,1fr) 46px;padding:11px 12px}
        .gs78-doc .gs78-doc-icon{width:42px;height:42px}
        .gs80-doc-toolbar{align-items:stretch;flex-direction:column}
        .gs80-all-docs{width:100%}
        h2{font-size:22px!important}
      }
    `;
  }
  function gs78DecorateStart(){
    const card=document.querySelector('#jornada .registration-card');
    if(!card)return;
    gs77BindStart();
    card.classList.add('gs78-start');
    let shell=card.querySelector('.gs78-start-shell');
    if(!shell){
      const regGrid=card.querySelector('.reg-grid');
      const actions=card.querySelector('.actions');
      const oldH=card.querySelector(':scope > h2');
      const oldP=card.querySelector(':scope > p.help');
      if(oldH)oldH.style.display='none';if(oldP)oldP.style.display='none';
      shell=document.createElement('div');shell.className='gs78-start-shell';
      const hero=document.createElement('div');hero.className='gs78-hero';
      hero.innerHTML='<img src="./gs-docs-field-hero.webp" alt=""><div class="gs78-brand"><b>GS Documentos</b><span>Documentación técnica en campo</span></div>';
      const body=document.createElement('div');body.className='gs78-start-body';
      body.innerHTML='<h2>Bienvenido</h2>';
      if(regGrid)body.appendChild(regGrid);
      if(actions)body.appendChild(actions);
      shell.append(hero,body);
      card.appendChild(shell);
    }
    const ced=document.getElementById('jornada_cedula');
    if(ced){const host=ced.closest('.reg-field')||ced.parentElement;if(host)host.style.display='none';ced.required=false}
    const sigStatus=document.getElementById('jornadaFirmaStatus');
    if(sigStatus){const host=sigStatus.closest('.reg-field')||sigStatus.parentElement;if(host)host.style.display='none'}
    document.getElementById('jornadaFirma')?.style.setProperty('display','none','important');
    const n=document.getElementById('jornada_nombre');
    if(n){n.placeholder='Nombre completo';const l=n.closest('.reg-field')?.querySelector('label');if(l)l.innerHTML='Nombre del técnico / gestor <span class="req">*</span>'}
    const b=document.getElementById('jornadaStart');if(b)b.textContent='Iniciar  →';
  }

  function gs78RenderDocs(){
    const g=document.getElementById('docGrid');if(!g)return;
    g.className='docgrid gs78-doc-grid';g.innerHTML='';

    let toolbar=document.getElementById('gs80DocToolbar');
    if(toolbar)toolbar.remove();
    toolbar=document.createElement('div');
    toolbar.id='gs80DocToolbar';
    toolbar.className='gs80-doc-toolbar';
    toolbar.innerHTML='<div class="gs80-doc-note"><b>TD se genera siempre.</b> Selecciona únicamente los documentos adicionales que necesites.</div><button type="button" class="btn secondary gs80-all-docs">Todos los documentos</button>';
    g.parentElement?.insertBefore(toolbar,g);

    toolbar.querySelector('.gs80-all-docs').onclick=()=>{
      state.selected=GS78_DOCS.filter(([id])=>id!=='TD').map(([id])=>id);
      if(typeof save==='function')save();
      gs78RenderDocs();
      try{renderForm()}catch(_){}
    };

    GS78_DOCS.forEach(([id,label])=>{
      const required=id==='TD';
      const on=required||state.selected?.includes(id);
      const b=document.createElement('button');
      b.type='button';b.className='gs78-doc '+(on?'on ':'')+(required?'required':'');b.dataset.doc=id;
      b.innerHTML='<span class="gs78-doc-icon">▤</span><span><strong>'+escapeText(id)+'</strong><small>'+escapeText(label)+(required?' · Generación automática':'')+'</small></span>'+(required?'<span class="gs80-mandatory">AUTOMÁTICO</span>':'<span class="gs78-switch" aria-hidden="true"></span>');
      if(!required)b.onclick=()=>{
        state.selected=Array.isArray(state.selected)?state.selected.filter(x=>x!=='TD'):[];
        state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];
        if(typeof save==='function')save();
        gs78RenderDocs();
        try{renderForm()}catch(_){}
      };
      g.appendChild(b);
    });
  }
  function gs78HideRedundantNav(){
    document.querySelectorAll('.topnav .nav').forEach(n=>{
      if(n.dataset.go==='signatures'||/firmas/i.test(n.textContent||''))n.style.display='none';
    });
  }

  function gs78SignatureCard(kind,title){
    const has=!!state.signatures?.[kind];
    const wrap=document.createElement('div');wrap.className='gs78-sign-card';
    wrap.innerHTML='<b>'+escapeText(title)+'</b><div class="gs78-sign-preview">'+(has?'<img alt="Firma">':'Pendiente')+'</div><button type="button" class="btn '+(has?'secondary':'')+'">'+(has?'Actualizar firma':'Firmar')+'</button>';
    if(has)wrap.querySelector('img').src=state.signatures[kind];
    wrap.querySelector('button').onclick=()=>{try{openSignatureModal(kind)}catch(e){console.error(e)}};
    return wrap;
  }

  function gs78IntegrateSignatures(){
    const card=document.querySelector('#form>.card');const host=document.getElementById('formHost');
    if(!card||!host)return;
    let panel=document.getElementById('gs78Signatures');
    if(panel)panel.remove();
    panel=document.createElement('div');panel.id='gs78Signatures';panel.className='gs78-signatures';
    panel.innerHTML='<h3>Firmas</h3><div class="gs78-sign-grid"></div>';
    const grid=panel.querySelector('.gs78-sign-grid');
    grid.append(gs78SignatureCard('solicitante','Firma del usuario'),gs78SignatureCard('tecnico','Firma del técnico / gestor'));
    host.insertAdjacentElement('afterend',panel);
  }

  function gs78DecorateGenerate(){
    const card=document.querySelector('#generate>.card');if(!card)return;
    const help=card.querySelector('.help');if(help)help.style.display='none';
    let r=document.getElementById('gs78Review');if(r)r.remove();
    r=document.createElement('div');r.id='gs78Review';r.className='gs78-review';
    const docs=GS78_DOCS.filter(([id])=>id==='TD'||state.selected?.includes(id)).map(([id])=>id);
    r.innerHTML='<div class="gs78-review-box"><h3>Documentos a generar</h3><div class="gs78-review-list">'+docs.map(d=>'<span class="gs78-ok">✓ '+escapeText(d)+'</span>').join('')+'</div></div>'+
      '<div class="gs78-review-box"><h3>Validación final</h3><div class="gs78-review-list"><span class="'+(state.signatures?.solicitante?'gs78-ok':'gs78-pending')+'">'+(state.signatures?.solicitante?'✓':'○')+' Firma del usuario</span><span class="'+(state.signatures?.tecnico?'gs78-ok':'gs78-pending')+'">'+(state.signatures?.tecnico?'✓':'○')+' Firma del técnico</span><span class="gs78-ok">✓ '+((state.supports?.length)||0)+' soporte(s)</span></div></div>';
    const actions=card.querySelector('.actions');card.insertBefore(r,actions||null);
    const gen=document.getElementById('genZip');if(gen)gen.textContent='Generar paquete  →';
  }

  function gs78ApplyVisuals(){
    gs78InjectStyles();gs78HideRedundantNav();gs78DecorateStart();
    if(document.getElementById('home')?.classList.contains('active'))gs78RenderDocs();
    if(document.getElementById('form')?.classList.contains('active'))gs78IntegrateSignatures();
    if(document.getElementById('generate')?.classList.contains('active'))gs78DecorateGenerate();
  }

  function bindFreshButton(id,handler){
    const old=document.querySelector('#'+id);
    if(!old||old.dataset.gsV77Bound==='1') return;
    const btn=old.cloneNode(true);
    btn.dataset.gsV77Bound='1';
    old.replaceWith(btn);
    btn.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopImmediatePropagation();
      Promise.resolve(handler()).catch(e=>{console.error(e);toast('Error: '+e.message)});
    });
  }
  function rebind(){
    bindFreshButton('saveRegister',saveRegistration);
    bindFreshButton('exportJornada',exportJornada);
    bindFreshButton('closeJornada',closeJornada);
    bindFreshButton('genZip',generateZip);
  }

  try{renderDocs=gs78RenderDocs}catch(e){warn('renderDocs visual',e)}
  try{
    const originalRenderForm=renderForm;
    renderForm=function(){
      const r=originalRenderForm.apply(this,arguments);
      setTimeout(()=>{
        gs77BindFormFlow();
        gs77ApplyRetieTech();
        gs77EnsureECEditableFields();
        gs77RemoveECLoadControls();
        gs77UpdateNavLocks();
        gs78IntegrateSignatures();
        gs78ApplyVisuals();
      },0);
      return r;
    };
  }catch(e){warn('renderForm',e)}

  try{
    const originalRenderRegistration=renderRegistration;
    renderRegistration=function(){const r=originalRenderRegistration.apply(this,arguments);forceApplus();gs77DecorateJornada();gs77ApplyRetieTech();gs77FixTxtAndRoSafe();hideContractor();bindIndependentGarrawall();rebind();setTimeout(()=>{gs77BindRegistrationDate();gs77BindAddressRule();gs78ApplyVisuals()},0);return r};
  }catch(e){warn('renderRegistration',e)}
  try{
    const gs78OriginalRenderSignatures=renderSignatures;
    renderSignatures=function(){const r=gs78OriginalRenderSignatures.apply(this,arguments);setTimeout(()=>{gs78IntegrateSignatures();gs78ApplyVisuals()},0);return r};
  }catch(e){warn('renderSignatures visual',e)}
  try{
    const originalRenderRecords=renderRecordsScreen;
    renderRecordsScreen=function(){const r=originalRenderRecords.apply(this,arguments);rebind();return r};
  }catch(e){warn('renderRecords',e)}

  forceApplus();gs77DecorateJornada();gs77ApplyRetieTech();gs77FixTxtAndRoSafe();hideContractor();bindIndependentGarrawall();rebind();gs77EnsureCurrentRecord();gs77UpdateNavLocks();gs78InjectStyles();gs78RenderDocs();setTimeout(()=>{gs77BindRegistrationDate();gs77BindAddressRule();gs78ApplyVisuals()},0);setTimeout(()=>{gs77PrepareDocumentScreen(state.screen||'register');gs78ApplyVisuals()},0);

  Promise.allSettled(['E1','AR','E6','RETIE','DJ','TD','EC'].map(loadTemplate)).then(rs=>{
    const bad=rs.filter(x=>x.status==='rejected');
    if(bad.length) warn('Plantillas con error',bad);
    else log('plantillas aprobadas listas');
  });
  log('activo · v77 · E1 Orden RO obligatorio en No de solicitud');
})();