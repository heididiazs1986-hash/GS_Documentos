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
        '<button type="button" class="sig-source-btn active" id="gs122Draw"><svg class="sig-source-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 3.3 20.7 9.3 10.2 19.8 4.2 21.2 5.6 15.2 14.7 3.3Zm-7.1 12.9-1 3.2 3.2-.8-2.2-2.4Zm7.2-10.3L8.9 13.7l2.9 2.9 7.4-7.3-4.4-4.4Z"/></svg><span>Dibujar</span></button>'+
        '<button type="button" class="sig-source-btn" id="gs122Upload"><svg class="sig-source-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4V4Zm2 2v9.2l3.8-3.8 3.1 3.1 2.2-2.2L18 15.2V6H6Zm10 1.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z"/></svg><span>Cargar imagen</span></button>'+
        '<button type="button" class="sig-source-btn" id="gs122Camera"><svg class="sig-source-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 5 9.6 3h4.8l1.3 2H20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.3ZM12 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg><span>Tomar foto</span></button>'+
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
    if(help){
      help.innerHTML=fromTxt
        ? '<b>Coordenadas precargadas desde el TXT.</b> Puedes corregirlas si no corresponden con la ubicación real.'
        : '<b>Ingreso manual habilitado.</b> Puedes escribir las coordenadas tomadas de las fotos o usar “Capturar GPS”.';
    }

    if(lat.dataset.gs122!=='1'){
      lat.dataset.gs122='1';
      lat.addEventListener('blur',()=>normalizeCoordInput(lat,-90,90,'latitud'));
    }
    if(lon.dataset.gs122!=='1'){
      lon.dataset.gs122='1';
      lon.addEventListener('blur',()=>normalizeCoordInput(lon,-180,180,'longitud'));
    }
    if(precision){
      precision.required=false;
      precision.removeAttribute('required');
      precision.placeholder='Precisión GPS (m) · opcional';
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