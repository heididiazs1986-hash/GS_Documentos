/* GS Documentos v122 · firma por dibujo/imagen/cámara + coordenadas manuales */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V122_SIGNATURE_GPS__) return;
  globalThis.__GS_DOCS_V122_SIGNATURE_GPS__=true;

  const q=s=>document.querySelector(s);

  function fileToDataURL(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(reader.error||new Error('No se pudo leer la imagen'));
      reader.readAsDataURL(file);
    });
  }

  async function useSignatureImage(file){
    try{
      if(!file)return;
      if(!String(file.type||'').startsWith('image/')){
        toast('Selecciona una imagen de firma');
        return;
      }
      if(file.size>15*1024*1024){
        toast('La imagen es demasiado pesada. Usa una menor de 15 MB');
        return;
      }
      const src=await fileToDataURL(file);
      const normalized=await normalizeSignatureDataURL(src);
      pendingSignatureData=normalized;
      const img=q('#sigPreviewImg');
      if(img)img.src=normalized;
      setSignatureStage('preview');
      toast('Firma preparada. Revisa y confirma');
    }catch(e){
      console.error('GS v122 firma imagen',e);
      toast('No fue posible procesar la imagen de firma');
    }
  }

  function ensureSignatureSources(){
    const modal=q('#sigModal'), capture=q('#sigCaptureStage');
    if(!modal||!capture||q('#gs122SignatureSources'))return;

    const box=document.createElement('div');
    box.id='gs122SignatureSources';
    box.className='signature-source-panel';
    box.innerHTML=
      '<div class="signature-source-title">¿Cómo quieres agregar la firma?</div>'+
      '<div class="signature-source-buttons">'+
        '<button type="button" class="sig-source-btn active" id="gs122Draw">✍️ Dibujar</button>'+
        '<button type="button" class="sig-source-btn" id="gs122Upload">🖼️ Cargar imagen</button>'+
        '<button type="button" class="sig-source-btn" id="gs122Camera">📷 Tomar foto</button>'+
      '</div>'+
      '<div class="signature-source-help">La imagen se recorta, centra y limpia automáticamente. Solo se guarda la firma procesada.</div>'+
      '<input class="hidden-force" id="gs122SignatureFile" type="file" accept="image/png,image/jpeg,image/webp,image/*">'+
      '<input class="hidden-force" id="gs122SignatureCamera" type="file" accept="image/*" capture="environment">';
    capture.parentElement.insertBefore(box,capture);

    const draw=q('#gs122Draw'), upload=q('#gs122Upload'), camera=q('#gs122Camera');
    const file=q('#gs122SignatureFile'), cam=q('#gs122SignatureCamera');

    const mark=btn=>{
      [draw,upload,camera].forEach(b=>b?.classList.toggle('active',b===btn));
    };

    draw.onclick=()=>{
      mark(draw);
      pendingSignatureData=null;
      setSignatureStage('capture');
      setTimeout(()=>prepareFullCanvas(true),40);
    };
    upload.onclick=()=>{mark(upload);file.value='';file.click()};
    camera.onclick=()=>{mark(camera);cam.value='';cam.click()};
    file.onchange=()=>useSignatureImage(file.files?.[0]);
    cam.onchange=()=>useSignatureImage(cam.files?.[0]);

    const repeat=q('#sigRepeat');
    if(repeat && repeat.dataset.gs122!=='1'){
      repeat.dataset.gs122='1';
      repeat.addEventListener('click',()=>setTimeout(()=>mark(draw),0));
    }
  }

  function normalizeCoordInput(el,min,max,key){
    if(!el)return;
    const raw=String(el.value||'').trim().replace(',','.');
    if(!raw){state.registration[key]='';save();return}
    const n=Number(raw);
    if(!Number.isFinite(n)||n<min||n>max){
      toast(key==='latitud'?'Latitud inválida':'Longitud inválida');
      return;
    }
    el.value=raw;
    state.registration[key]=raw;
    save();
  }

  function enhanceManualCoordinates(){
    const lat=q('#reg_lat'),lon=q('#reg_lon');
    if(!lat||!lon)return;

    const fromTxt=!!String(state.registration?._txt_selected||'').trim();
    const precision=q('#reg_precision');
    let help=q('#gs122CoordHelp');

    if(!fromTxt){
      lat.readOnly=false;lon.readOnly=false;
      lat.removeAttribute('readonly');lon.removeAttribute('readonly');
      lat.classList.add('manual-coordinate');
      lon.classList.add('manual-coordinate');
      lat.placeholder='Latitud (Y) · editable';
      lon.placeholder='Longitud (X) · editable';

      if(!help){
        help=document.createElement('div');
        help.id='gs122CoordHelp';
        help.className='coordinate-entry-help';
        lon.closest('.gps-row')?.insertAdjacentElement('afterend',help);
      }
      if(help)help.innerHTML='<b>Ingreso manual habilitado.</b> Puedes escribir las coordenadas tomadas de las fotos o usar “Capturar GPS”.';

      if(lat.dataset.gs122!=='1'){
        lat.dataset.gs122='1';
        lat.addEventListener('blur',()=>normalizeCoordInput(lat,-90,90,'latitud'));
      }
      if(lon.dataset.gs122!=='1'){
        lon.dataset.gs122='1';
        lon.addEventListener('blur',()=>normalizeCoordInput(lon,-180,180,'longitud'));
      }
      if(precision)precision.placeholder='Precisión GPS (m) · automática';
    }else{
      lat.readOnly=true;lon.readOnly=true;
      lat.classList.remove('manual-coordinate');lon.classList.remove('manual-coordinate');
      if(help)help.innerHTML='<b>Coordenadas cargadas desde el TXT.</b> Se conservan bloqueadas para evitar cambios accidentales.';
    }
  }

  function enhance(){
    try{ensureSignatureSources()}catch(e){console.warn('GS v122 firma UI',e)}
    try{enhanceManualCoordinates()}catch(e){console.warn('GS v122 coordenadas',e)}
  }

  try{
    if(typeof openSignatureModal==='function'){
      const oldOpen=openSignatureModal;
      openSignatureModal=function(){
        const r=oldOpen.apply(this,arguments);
        setTimeout(ensureSignatureSources,0);
        return r;
      };
    }
  }catch(_){}

  try{
    if(typeof renderRegistration==='function'){
      const oldRender=renderRegistration;
      renderRegistration=function(){
        const r=oldRender.apply(this,arguments);
        setTimeout(enhanceManualCoordinates,0);
        return r;
      };
    }
  }catch(_){}

  document.addEventListener('click',e=>{
    if(e.target?.id==='regUserSignatureBtn'||e.target?.id==='jornadaFirma'){
      setTimeout(ensureSignatureSources,40);
    }
  },true);

  setTimeout(enhance,0);
  console.info('GS Documentos v122 · firma imagen/cámara y coordenadas manuales activas');
})();