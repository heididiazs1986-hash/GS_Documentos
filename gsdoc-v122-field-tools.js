/* GS Documentos v122 · firmas por imagen + coordenadas editables + observación ESPT */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V122_FIELD_TOOLS__) return;
  globalThis.__GS_DOCS_V122_FIELD_TOOLS__=true;

  const q=s=>document.querySelector(s);
  let currentSignatureKind=null;
  let uploadedPending=null;

  const titleCase=value=>{
    const small=new Set(['de','del','la','las','los','y','e','o','en','al','por','para','con','sin','a']);
    let first=true;
    return String(value||'').trim().replace(/\s+/g,' ').split(/(\s+|-|\/)/).map(part=>{
      if(/^\s+$|^-$|^\/$/.test(part)) return part;
      const low=part.toLocaleLowerCase('es-CO');
      const out=(!first&&small.has(low))?low:(low?low.charAt(0).toLocaleUpperCase('es-CO')+low.slice(1):'');
      first=false; return out;
    }).join('');
  };

  function normalizeCoordTyping(v){
    let s=String(v??'').replace(/,/g,'.').replace(/[^0-9.\-]/g,'');
    s=s.replace(/(?!^)-/g,'');
    const parts=s.split('.');
    if(parts.length>2)s=parts.shift()+'.'+parts.join('');
    return s.slice(0,18);
  }
  function validCoord(v,min,max){
    if(String(v||'').trim()==='') return false;
    const n=Number(v);
    return Number.isFinite(n)&&n>=min&&n<=max;
  }
  function persistCurrentCoordinates(){
    if(!state.currentRecord?.id_registro||typeof records!=='function'||typeof saveRecords!=='function')return;
    const all=records();
    const ix=all.findIndex(x=>x.id_registro===state.currentRecord.id_registro);
    if(ix<0)return;
    all[ix]={...all[ix],latitud:state.registration.latitud||'',longitud:state.registration.longitud||'',fecha_hora_actualizacion:new Date().toISOString()};
    saveRecords(all);
    state.currentRecord={...all[ix]};
  }
  function syncCoords(lat,lon,persist=false){
    state.registration=state.registration||{};
    state.form=state.form||{};
    state.registration.latitud=normalizeCoordTyping(lat);
    state.registration.longitud=normalizeCoordTyping(lon);
    state.form.e1_coord_y=state.registration.latitud;
    state.form.e1_coord_x=state.registration.longitud;
    if(state.currentRecord){
      state.currentRecord.latitud=state.registration.latitud;
      state.currentRecord.longitud=state.registration.longitud;
      if(persist)persistCurrentCoordinates();
    }
    try{save()}catch(_){}
  }

  function bindCoordInputs(lat,lon){
    if(!lat||!lon)return;
    for(const el of [lat,lon]){
      el.readOnly=false;el.disabled=false;el.removeAttribute('readonly');el.removeAttribute('disabled');
      el.classList.add('gs122-coordinate-input');
    }
    lat.placeholder='Latitud (Y) · editable';
    lon.placeholder='Longitud (X) · editable';

    if(lat.dataset.gs122Bound!=='1'){
      lat.dataset.gs122Bound='1';
      lat.addEventListener('input',()=>{lat.value=normalizeCoordTyping(lat.value);syncCoords(lat.value,lon.value,false)});
      lat.addEventListener('blur',()=>{
        syncCoords(lat.value,lon.value,true);
        lat.classList.toggle('gs122-invalid',lat.value!==''&&!validCoord(lat.value,-90,90));
        if(lat.value!==''&&!validCoord(lat.value,-90,90))toast('Latitud inválida: debe estar entre -90 y 90');
      });
    }
    if(lon.dataset.gs122Bound!=='1'){
      lon.dataset.gs122Bound='1';
      lon.addEventListener('input',()=>{lon.value=normalizeCoordTyping(lon.value);syncCoords(lat.value,lon.value,false)});
      lon.addEventListener('blur',()=>{
        syncCoords(lat.value,lon.value,true);
        lon.classList.toggle('gs122-invalid',lon.value!==''&&!validCoord(lon.value,-180,180));
        if(lon.value!==''&&!validCoord(lon.value,-180,180))toast('Longitud inválida: debe estar entre -180 y 180');
      });
    }
  }

  function observationText(){
    const r=state.registration||state.currentRecord||{};
    const ro=String(r.orden_ro||'').trim()||'—';
    const nombre=titleCase(r.nombres||'');
    const cc=String(r.identificacion||'').trim()||'—';
    const celular=String(r.contacto||'').trim()||'—';
    const direccion=String(r.direccion||'').trim()||'—';
    const sector=titleCase(r.sector||'')||'—';
    const localidad=titleCase(r.localidad||r.municipio||'')||'—';
    return 'Orden para diagnóstico de predios ESPT. Verificación del predio para solicitud de conexión. Número de RO: '+ro+
      '. Se llega a la dirección '+direccion+', barrio/sector '+sector+', localidad '+localidad+
      '. Usuario: '+(nombre||'—')+', C.C. '+cc+', celular '+celular+
      '. La documentación se encuentra al día. Las condiciones del predio e instalaciones internas cumplen la norma vigente para realizar obra. Se anexa registro fotográfico.';
  }

  async function copyText(text){
    try{
      if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text)}
      else{
        const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');ta.remove();
      }
      toast('✅ Observación copiada');
    }catch(e){toast('No fue posible copiar la observación')}
  }

  function buildObservationCard(id){
    const wrap=document.createElement('div');
    wrap.className='gs122-observation-card';
    wrap.id=id;
    wrap.innerHTML='<div class="gs122-observation-title"><span>Observación ESPT para copiar</span><button type="button" class="btn secondary gs122-copy-observation">📋 Copiar</button></div>'+
      '<textarea class="gs122-observation-text" rows="7" readonly></textarea>'+
      '<div class="gs122-observation-help">Se genera con la misma Orden_RO, nombre, cédula, celular, dirección, sector y localidad del registro.</div>';
    wrap.querySelector('.gs122-observation-text').value=observationText();
    wrap.querySelector('.gs122-copy-observation').onclick=()=>copyText(wrap.querySelector('.gs122-observation-text').value);
    return wrap;
  }

  function enhanceRegistration(){
    const lat=q('#reg_lat'),lon=q('#reg_lon');
    if(lat&&lon){
      bindCoordInputs(lat,lon);
      const host=lat.closest('.reg-field');
      if(host&&!host.querySelector('.gs122-coordinate-help')){
        const help=document.createElement('div');help.className='gs122-coordinate-help';
        help.textContent='Puedes capturar GPS o escribir/corregir manualmente las coordenadas. Las coordenadas finales visibles se usan en el E1 y en el Excel. La precisión no es obligatoria para digitación manual.';
        host.appendChild(help);
      }
    }
    if(state.regStep===5){
      const regHost=q('#regHost');
      if(regHost&&!q('#gs122ObservationReg'))regHost.appendChild(buildObservationCard('gs122ObservationReg'));
      else if(q('#gs122ObservationReg .gs122-observation-text'))q('#gs122ObservationReg .gs122-observation-text').value=observationText();
    }
  }

  function enhanceSaved(){
    const card=q('#saved .decision-card');
    if(!card)return;
    let obs=q('#gs122ObservationSaved');
    if(!obs){obs=buildObservationCard('gs122ObservationSaved');card.appendChild(obs)}
    else obs.querySelector('.gs122-observation-text').value=observationText();
  }

  function enhanceFormCoordinates(){
    if(!Array.isArray(state.selected)||!state.selected.includes('E1'))return;
    const host=q('#formHost');if(!host)return;
    let panel=q('#gs122E1Coords');
    if(!panel){
      panel=document.createElement('div');panel.id='gs122E1Coords';panel.className='section gs122-e1-coords';
      panel.innerHTML='<div class="section-title">Coordenadas finales E1</div>'+
        '<p class="help">Puedes corregirlas aquí antes de generar. Estos valores también quedan en el registro exportado.</p>'+
        '<div class="gps-row"><input id="gs122_e1_lat" inputmode="decimal" placeholder="Latitud (Y)"><input id="gs122_e1_lon" inputmode="decimal" placeholder="Longitud (X)"></div>';
      host.prepend(panel);
    }
    const lat=q('#gs122_e1_lat'),lon=q('#gs122_e1_lon');
    lat.value=state.registration?.latitud||state.currentRecord?.latitud||state.form?.e1_coord_y||'';
    lon.value=state.registration?.longitud||state.currentRecord?.longitud||state.form?.e1_coord_x||'';
    bindCoordInputs(lat,lon);
  }

  async function processSignatureFile(file){
    if(!file||!/^image\//i.test(file.type||''))throw new Error('Selecciona una imagen JPG, PNG o WEBP');
    if(file.size>12*1024*1024)throw new Error('La imagen es demasiado grande');
    const src=await new Promise((resolve,reject)=>{
      const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(new Error('No se pudo leer la imagen'));fr.readAsDataURL(file);
    });
    const img=await new Promise((resolve,reject)=>{
      const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('No se pudo abrir la imagen'));im.src=src;
    });
    const maxSide=1800,scale=Math.min(1,maxSide/Math.max(img.width,img.height));
    const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
    const base=document.createElement('canvas');base.width=w;base.height=h;
    const ctx=base.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h),px=data.data;

    const samples=[];
    const sx=Math.max(1,Math.floor(w/25)),sy=Math.max(1,Math.floor(h/25));
    for(let x=0;x<w;x+=sx){
      for(const y of [0,Math.min(h-1,sy),Math.max(0,h-1-sy),h-1]){
        const i=(y*w+x)*4;samples.push((px[i]+px[i+1]+px[i+2])/3);
      }
    }
    for(let y=0;y<h;y+=sy){
      for(const x of [0,Math.min(w-1,sx),Math.max(0,w-1-sx),w-1]){
        const i=(y*w+x)*4;samples.push((px[i]+px[i+1]+px[i+2])/3);
      }
    }
    samples.sort((a,b)=>a-b);
    const bg=samples[Math.floor(samples.length*.7)]||245;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      const lum=.2126*px[i]+.7152*px[i+1]+.0722*px[i+2];
      const darkness=Math.max(0,bg-lum);
      let a=Math.max(0,Math.min(255,(darkness-10)*7));
      if(lum<105)a=255;
      px[i]=18;px[i+1]=18;px[i+2]=18;px[i+3]=a;
      if(a>28){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
    }
    ctx.putImageData(data,0,0);
    if(maxX<minX||maxY<minY)throw new Error('No se detectó una firma clara en la imagen');
    const pad=Math.max(12,Math.round(Math.min(w,h)*.025));
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    const cw=maxX-minX+1,ch=maxY-minY+1;
    const out=document.createElement('canvas');out.width=1200;out.height=450;
    const o=out.getContext('2d');o.clearRect(0,0,out.width,out.height);
    const fit=Math.min(1080/cw,360/ch),dw=cw*fit,dh=ch*fit;
    o.drawImage(base,minX,minY,cw,ch,(out.width-dw)/2,(out.height-dh)/2,dw,dh);
    return out.toDataURL('image/png');
  }

  function showUploadedPreview(data){
    uploadedPending=data;
    const img=q('#sigPreviewImg');if(img)img.src=data;
    try{setSignatureStage('preview')}catch(_){
      const cap=q('#sigCaptureStage'),prev=q('#sigPreviewStage'),act=q('#sigModalActions');
      if(cap)cap.style.display='none';if(prev)prev.classList.add('active');if(act){act.classList.add('preview-mode');act.classList.remove('capture-mode')}
    }
  }

  function ensureSignatureTools(){
    const modal=q('#sigModal'),stage=q('#sigCaptureStage'),actions=q('#sigModalActions');
    if(!modal||!stage||!actions)return;
    let tools=q('#gs122SignatureSources');
    if(!tools){
      tools=document.createElement('div');tools.id='gs122SignatureSources';tools.className='gs122-signature-sources';
      tools.innerHTML='<button type="button" class="btn secondary" id="gs122DrawSig">✍️ Dibujar</button>'+
        '<button type="button" class="btn secondary" id="gs122UploadSig">🖼️ Cargar imagen</button>'+
        '<button type="button" class="btn secondary" id="gs122PhotoSig">📷 Tomar foto</button>'+
        '<input id="gs122UploadInput" type="file" accept="image/png,image/jpeg,image/webp" hidden>'+
        '<input id="gs122PhotoInput" type="file" accept="image/*" capture="environment" hidden>'+
        '<div class="gs122-signature-note">La imagen se procesa localmente: se recorta y limpia el fondo; no se guarda la foto original.</div>';
      stage.parentElement.insertBefore(tools,stage);
      q('#gs122DrawSig').onclick=()=>{uploadedPending=null;try{setSignatureStage('capture');prepareFullCanvas(true)}catch(_){}};
      q('#gs122UploadSig').onclick=()=>q('#gs122UploadInput').click();
      q('#gs122PhotoSig').onclick=()=>q('#gs122PhotoInput').click();
      const handle=async input=>{
        const file=input.files?.[0];input.value='';if(!file)return;
        try{toast('Procesando firma…');showUploadedPreview(await processSignatureFile(file));toast('Firma lista para revisar')}
        catch(e){toast(e.message||'No se pudo procesar la firma')}
      };
      q('#gs122UploadInput').onchange=e=>handle(e.target);
      q('#gs122PhotoInput').onchange=e=>handle(e.target);
    }
  }

  try{
    const oldOpen=openSignatureModal;
    openSignatureModal=function(id){currentSignatureKind=id;uploadedPending=null;const r=oldOpen.apply(this,arguments);setTimeout(ensureSignatureTools,0);return r};
  }catch(_){}

  function bindSignatureConfirm(){
    ensureSignatureTools();
    const confirm=q('#sigConfirm');if(confirm&&confirm.dataset.gs122Bound!=='1'){
      confirm.dataset.gs122Bound='1';
      const old=confirm.onclick;
      confirm.onclick=()=>{
        if(!uploadedPending)return old?.();
        if(!currentSignatureKind)return;
        state.signatures=state.signatures||{};
        state.signatures[currentSignatureKind]=uploadedPending;
        try{persistSignatureToCurrentRecord(currentSignatureKind,uploadedPending)}catch(_){}
        try{save()}catch(_){}
        uploadedPending=null;
        try{closeSignatureModal()}catch(_){}
        try{renderSignatures()}catch(_){}
        try{renderJornada()}catch(_){}
        try{renderRegistration()}catch(_){}
        toast('Firma confirmada');
      };
    }
    const repeat=q('#sigRepeat');if(repeat&&repeat.dataset.gs122Bound!=='1'){
      repeat.dataset.gs122Bound='1';const old=repeat.onclick;
      repeat.onclick=()=>{uploadedPending=null;return old?.()};
    }
    const cancel=q('#sigCancel');if(cancel&&cancel.dataset.gs122Bound!=='1'){
      cancel.dataset.gs122Bound='1';const old=cancel.onclick;
      cancel.onclick=()=>{uploadedPending=null;currentSignatureKind=null;return old?.()};
    }
  }

  try{
    const oldRender=renderRegistration;
    renderRegistration=function(){const r=oldRender.apply(this,arguments);setTimeout(()=>{enhanceRegistration();enhanceSaved();bindSignatureConfirm()},0);return r};
  }catch(_){}
  try{
    const oldForm=renderForm;
    renderForm=function(){const r=oldForm.apply(this,arguments);setTimeout(()=>{enhanceFormCoordinates();bindSignatureConfirm()},0);return r};
  }catch(_){}
  try{
    const oldShow=show;
    show=function(id){const r=oldShow.apply(this,arguments);setTimeout(()=>{if(id==='saved')enhanceSaved();if(id==='register')enhanceRegistration();if(id==='form')enhanceFormCoordinates();bindSignatureConfirm()},0);return r};
  }catch(_){}

  try{
    const oldValidate=validateStep;
    validateStep=function(step){
      if(step===5){
        const lat=state.registration?.latitud,lon=state.registration?.longitud;
        if(lat&&!validCoord(lat,-90,90)){toast('Latitud inválida: debe estar entre -90 y 90');return false}
        if(lon&&!validCoord(lon,-180,180)){toast('Longitud inválida: debe estar entre -180 y 180');return false}
      }
      return oldValidate.apply(this,arguments);
    };
  }catch(_){}

  setTimeout(()=>{enhanceRegistration();enhanceSaved();enhanceFormCoordinates();bindSignatureConfirm()},50);
  console.info('GS Documentos v122 · herramientas de campo activas');
})();