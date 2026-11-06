/* GS Documentos v150 · Soportes: escanear con la cámara o cargar archivos.
 * Usa el motor de escaneo de GS Studio (gs-scan-engine.js). Todo se procesa en el teléfono. */
(()=>{
  'use strict';
  if(globalThis.__GS_DOCS_V150_SUPPORTS__) return;
  globalThis.__GS_DOCS_V150_SUPPORTS__=true;

  const $=s=>document.querySelector(s);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
  const say=m=>{try{toast(m)}catch(_){}};
  const STABLE_TICKS=4;           // ≈1 s con la hoja casi quieta antes de la captura automática
  const STABLE_TICKS_CUT=12;      // si la hoja parece no caber completa, solo se captura sola tras ≈3 s quieta
  const PDF_SIZES={A4:[595.28,841.89],Carta:[612,792],Oficio:[612,936],Legal:[612,1008]};
  const SOFT_LIMIT=25*1024*1024;

  const thumbs=new WeakMap();   // File -> URL de miniatura
  const meta=new WeakMap();     // File -> {pages}
  const origin=new WeakMap();   // File -> clave del archivo original (evita duplicados)

  /* ───────────────────────── lista de soportes ───────────────────────── */
  const fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
  const isSupported=f=>/^image\//i.test(f.type||'')||/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name||'')||f.type==='application/pdf'||/\.pdf$/i.test(f.name||'');
  const isImage=f=>/^image\//i.test(f.type||'')||/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name||'');
  const safeName=n=>String(n||'soporte').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim()||'soporte';
  function uniqueName(name,list){
    const taken=new Set(list.map(f=>f.name.toLowerCase()));
    const n=safeName(name);
    if(!taken.has(n.toLowerCase())) return n;
    const dot=n.lastIndexOf('.'),base=dot>0?n.slice(0,dot):n,ext=dot>0?n.slice(dot):'';
    for(let i=2;;i++){const c=base+' ('+i+')'+ext;if(!taken.has(c.toLowerCase()))return c}
  }
  function addFiles(files,opts){
    opts=opts||{};
    state.supports=Array.isArray(state.supports)?state.supports:[];
    let added=0,skipped=0;
    for(const file of files){
      if(!isSupported(file)){skipped++;continue}
      const key=file.name+'|'+file.size+'|'+file.lastModified;
      if(!opts.fromScan&&state.supports.some(f=>origin.get(f)===key)){skipped++;continue}
      // Dos fotos con el mismo nombre (p. ej. image.jpg) se pisarían dentro del ZIP: se renombran.
      const name=uniqueName(file.name,state.supports);
      const item=name===file.name?file:new File([file],name,{type:file.type,lastModified:file.lastModified});
      origin.set(item,key);
      if(opts.thumb)thumbs.set(item,opts.thumb);
      if(opts.pages)meta.set(item,{pages:opts.pages});
      state.supports.push(item);added++;
    }
    renderSupportsV150();
    return{added,skipped};
  }
  function removeSupport(index){
    const [file]=(state.supports||[]).splice(index,1);
    const url=file&&thumbs.get(file);
    if(url){URL.revokeObjectURL(url);thumbs.delete(file)}
    renderSupportsV150();
  }
  function renderSupportsV150(){
    const host=$('#supportPreview');if(!host)return;
    host.replaceChildren();
    const list=state.supports||[];
    list.forEach((f,i)=>{
      const card=document.createElement('div');card.className='gs150-item';
      const media=document.createElement('div');media.className='gs150-media';
      let url=thumbs.get(f);
      if(!url&&isImage(f)){url=URL.createObjectURL(f);thumbs.set(f,url)}
      if(url){
        const img=document.createElement('img');img.alt=f.name;img.src=url;
        img.onerror=()=>{img.remove();media.textContent='🖼️'};
        media.append(img);
      }else{media.textContent=/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)?'PDF':'📎';media.classList.add('gs150-doc')}
      const m=meta.get(f);
      if(m){const b=document.createElement('span');b.className='gs150-badge';b.textContent='Escaneo · '+m.pages+' pág.';media.append(b)}
      const del=document.createElement('button');del.type='button';del.className='gs150-del';del.textContent='×';
      del.setAttribute('aria-label','Quitar '+f.name);del.onclick=()=>removeSupport(i);
      const name=document.createElement('div');name.className='gs150-name';name.textContent=f.name;
      const size=document.createElement('div');size.className='gs150-size';size.textContent=fmtSize(f.size);
      card.append(media,del,name,size);host.append(card);
    });
    const info=$('#gs150Info');
    if(info){
      if(!list.length){info.textContent='Todavía no hay soportes. Puedes continuar sin ellos.';info.className='gs150-info'}
      else{
        const total=list.reduce((s,f)=>s+f.size,0);
        info.textContent=list.length+' soporte(s) · '+fmtSize(total)+(total>SOFT_LIMIT?' — el ZIP será pesado para compartir; considera quitar fotos innecesarias.':'');
        info.className='gs150-info'+(total>SOFT_LIMIT?' warn':'');
      }
    }
    const clear=$('#gs150Clear');if(clear)clear.hidden=list.length<2;
  }
  function report(r){
    if(r.added)say('✅ '+r.added+' soporte(s) agregado(s)'+(r.skipped?' · '+r.skipped+' omitido(s) (repetido o no compatible)':''));
    else if(r.skipped)say('No se agregó: archivo repetido o no compatible (usa foto o PDF).');
  }
  function ensureUI(){
    const card=$('#supports .card');if(!card||card.dataset.gs150==='1')return;
    card.dataset.gs150='1';
    const help=card.querySelector('.help');
    if(help)help.textContent='Opcional. Escanea documentos con la cámara o carga fotos y PDF del teléfono.';
    const input=$('#supportInput');if(!input)return;
    input.classList.add('gs150-hidden');
    input.setAttribute('accept','image/*,.pdf,application/pdf');input.multiple=true;
    input.dataset.gs77Bound='1';           // evita que el enlace antiguo reemplace la lista en vez de sumar
    input.onchange=e=>{const r=addFiles([...(e.target.files||[])]);e.target.value='';report(r)};
    const pick=document.createElement('div');pick.className='gs150-pick';
    pick.innerHTML=
      '<button type="button" class="gs150-opt gs150-opt-main" id="gs150ScanBtn"><span class="gs150-ico">📷</span><span><b>Escanear documento</b><small>Detecta la hoja y la deja como escáner</small></span></button>'+
      '<button type="button" class="gs150-opt" id="gs150UploadBtn"><span class="gs150-ico">📁</span><span><b>Cargar archivos</b><small>Fotos o PDF del teléfono</small></span></button>';
    input.before(pick);
    const info=document.createElement('div');info.id='gs150Info';info.className='gs150-info';info.setAttribute('aria-live','polite');
    const clear=document.createElement('button');clear.type='button';clear.id='gs150Clear';clear.className='gs150-clear';clear.textContent='Quitar todos';clear.hidden=true;
    clear.onclick=()=>{if(confirm('¿Quitar todos los soportes cargados?')){(state.supports||[]).forEach(f=>{const u=thumbs.get(f);if(u)URL.revokeObjectURL(u)});state.supports=[];renderSupportsV150()}};
    const row=document.createElement('div');row.className='gs150-inforow';row.append(info,clear);
    $('#supportPreview').before(row);
    $('#gs150ScanBtn').onclick=openScanner;
    $('#gs150UploadBtn').onclick=()=>input.click();
    renderSupportsV150();
  }
  try{window.renderSupports=renderSupportsV150}catch(_){}
  try{
    const prevShow=show;
    show=function(id){
      const out=prevShow.apply(this,arguments);
      if(id==='supports')setTimeout(()=>{try{ensureUI();renderSupportsV150()}catch(e){console.warn('GS Docs v150',e)}},0);
      return out;
    };
  }catch(e){console.warn('GS Docs v150: no se pudo enlazar show',e)}

  /* ───────────────────────── escáner ───────────────────────── */
  let R=null,S=null;
  const q=s=>R.querySelector(s);
  const Scan=()=>globalThis.GSScan;

  function buildOverlay(){
    const el=document.createElement('div');
    el.className='gs150-scanner';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Escanear soportes');
    el.innerHTML=
    '<section class="gs150-cam" data-stage="camera">'+
      '<video autoplay muted playsinline></video><div class="gs150-outline"></div><canvas class="gs150-edges"></canvas>'+
      '<div class="gs150-camtop"><button type="button" data-act="close" aria-label="Cerrar">✕</button><div class="gs150-camhint" data-role="hint" aria-live="polite">Enfoca la hoja completa</div>'+
        '<button type="button" data-act="torch" class="gs150-tog" hidden aria-label="Linterna">🔦</button><button type="button" data-act="auto" class="gs150-tog on" aria-pressed="true">Auto ✓</button></div>'+
      '<div class="gs150-cambottom"><small data-role="detect">Buscando<br>bordes…</small>'+
        '<div class="gs150-ring" data-role="ring"><button type="button" class="gs150-shutter" data-act="shoot" aria-label="Capturar hoja"></button></div>'+
        '<button type="button" class="gs150-finish" data-act="finish"><span data-role="count">0</span> hoja(s)<br><b>Listo →</b></button></div>'+
    '</section>'+
    '<section class="gs150-edit" data-stage="edit" hidden>'+
      '<header><h3>Revisa la hoja</h3><p data-role="edithint">Recorte automático · revisa los bordes</p></header>'+
      '<div class="gs150-body">'+
        '<div class="gs150-result"><canvas data-role="preview"></canvas></div>'+
        '<div class="gs150-filters" data-role="filters"><button type="button" data-filter="enhance" class="active">Auto</button><button type="button" data-filter="color">Original</button><button type="button" data-filter="gray">Grises</button><button type="button" data-filter="bw">B/N</button></div>'+
        '<div class="gs150-row"><button type="button" class="gs150-btn" data-act="turn">↻ Girar la hoja</button><button type="button" class="gs150-btn" data-act="corners">Ajustar esquinas</button></div>'+
        '<div class="gs150-manual" data-role="manual" hidden><p>Mueve los cuatro puntos naranjas a las esquinas reales de la hoja.</p>'+
          '<div class="gs150-surface"><canvas data-role="crop"></canvas></div>'+
          '<div class="gs150-row"><button type="button" class="gs150-btn" data-act="autobounds">Detectar bordes</button><button type="button" class="gs150-btn" data-act="resetbounds">Restablecer</button></div>'+
          '<button type="button" class="gs150-btn gs150-main" data-act="donecorners">Ver resultado corregido</button></div>'+
      '</div>'+
      '<footer><button type="button" class="gs150-btn" data-act="retake">Repetir foto</button><button type="button" class="gs150-btn gs150-main" data-act="addpage" disabled>Añadir hoja ✓</button></footer>'+
    '</section>'+
    '<section class="gs150-pages" data-stage="pages" hidden>'+
      '<header><h3>Documento escaneado</h3><p data-role="pagesinfo"></p></header>'+
      '<div class="gs150-body"><div class="gs150-thumbs" data-role="thumbs"></div>'+
        '<label class="gs150-field">Nombre del archivo<input type="text" data-role="filename" maxlength="80" autocomplete="off" autocapitalize="characters" placeholder="Ej. CEDULA_USUARIO"></label>'+
        '<p class="gs150-note">Se guardará como un solo PDF dentro de la carpeta SOPORTES del paquete.</p></div>'+
      '<footer><button type="button" class="gs150-btn" data-act="more">＋ Otra hoja</button><button type="button" class="gs150-btn gs150-main" data-act="save">Guardar PDF ✓</button></footer>'+
      '<button type="button" class="gs150-discard" data-act="discard">Descartar todo</button>'+
    '</section>'+
    '<input type="file" accept="image/*" capture="environment" data-role="fallback" hidden>';
    document.body.append(el);
    return el;
  }
  const stageNames=['camera','edit','pages'];
  function showStage(name){stageNames.forEach(n=>{const s=q('[data-stage="'+n+'"]');if(s)s.hidden=n!==name});S.stage=name}
  const setHint=t=>{const h=q('[data-role="hint"]');if(h&&h.textContent!==t)h.textContent=t};

  async function openScanner(){
    if(R)return;
    if(!Scan()){say('El motor de escaneo no cargó. Usa «Cargar archivos» o recarga la página.');return}
    state.supports=Array.isArray(state.supports)?state.supports:[];
    R=buildOverlay();
    S={stage:'camera',stream:null,imageCapture:null,torchOn:false,capturing:false,auto:true,token:0,smoothed:null,stable:0,live:null,liveAt:0,
       source:null,sourceData:null,corners:null,filter:'enhance',base:{key:'',canvas:null},seq:0,pages:[],ready:false,automatic:false,cornerIndex:-1,grab:{x:0,y:0},
       framing:null,fromCamera:false};
    document.documentElement.classList.add('gs150-lock');
    bindOverlay();
    await startCamera();
  }
  function bindOverlay(){
    R.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-act]');if(!b||b.disabled)return;
      const act=b.dataset.act;
      ({close:closeScanner,auto:toggleAuto,torch:toggleTorch,shoot:capture,finish:finishCapture,
        turn:turnSheet,corners:()=>{q('[data-role="manual"]').hidden=false;drawCorners();q('[data-role="manual"]').scrollIntoView({block:'nearest',behavior:'smooth'})},
        autobounds:autoBounds,resetbounds:resetBounds,donecorners:doneCorners,retake:retake,addpage:addPage,more:moreSheets,save:savePdf,discard:discardAll})[act]?.();
    });
    q('[data-role="filters"]').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-filter]');if(!b)return;
      S.filter=b.dataset.filter;
      R.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));
      if(S.source)refreshPreview();
    });
    q('[data-role="fallback"]').addEventListener('change',ev=>{
      const f=ev.target.files&&ev.target.files[0];ev.target.value='';
      if(f)loadPhoto(f,null);else if(!S.pages.length&&S.stage==='camera')closeScanner(true);
    });
    const crop=q('[data-role="crop"]');
    crop.addEventListener('pointerdown',ev=>{
      if(!S.source)return;
      const p=normalized(ev);
      S.cornerIndex=S.corners.reduce((best,c,i)=>distance(c,p)<distance(S.corners[best],p)?i:best,0);
      S.grab={x:S.corners[S.cornerIndex].x-p.x,y:S.corners[S.cornerIndex].y-p.y};
      crop.setPointerCapture(ev.pointerId);drawCorners();ev.preventDefault();
    });
    crop.addEventListener('pointermove',ev=>{
      if(S.cornerIndex<0)return;
      const p=normalized(ev);
      S.corners[S.cornerIndex]={x:clamp(p.x+S.grab.x,0,1),y:clamp(p.y+S.grab.y,0,1)};drawCorners();
    });
    for(const n of ['pointerup','pointercancel','lostpointercapture'])crop.addEventListener(n,()=>{if(S.cornerIndex>=0){S.cornerIndex=-1;drawCorners()}});
    addEventListener('resize',onResize);
  }
  const onResize=()=>{if(S&&S.source&&!q('[data-role="manual"]').hidden)drawCorners()};

  function closeScanner(silent){
    if(!R)return;
    if(!silent&&S.pages.length&&!confirm('¿Descartar las '+S.pages.length+' hoja(s) escaneadas?'))return;
    stopCamera();
    resetPhoto();
    for(const p of S.pages)URL.revokeObjectURL(p.thumb);
    removeEventListener('resize',onResize);
    R.remove();R=null;S=null;
    document.documentElement.classList.remove('gs150-lock');
  }
  function discardAll(){closeScanner(false)}

  /* ── imágenes ── */
  async function canvasFromImage(file,maxDimension){
    maxDimension=maxDimension||3200;
    let picture;
    if(typeof createImageBitmap==='function')try{picture=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_){}
    if(!picture){
      const url=URL.createObjectURL(file),img=new Image();
      try{await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('Formato de imagen no compatible'));img.src=url});picture=img}
      finally{URL.revokeObjectURL(url)}
    }
    const pw=picture.width||picture.naturalWidth,ph=picture.height||picture.naturalHeight;
    const k=Math.min(1,maxDimension/Math.max(pw,ph));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(pw*k));c.height=Math.max(1,Math.round(ph*k));
    c.getContext('2d',{willReadFrequently:true}).drawImage(picture,0,0,c.width,c.height);
    picture.close&&picture.close();
    return c;
  }
  const makeJpeg=(canvas,quality)=>new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(Error('No se pudo generar la imagen.')),'image/jpeg',quality||.9));
  const getSourceData=()=>S.sourceData||(S.sourceData=S.source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,S.source.width,S.source.height));
  const defaultCorners=()=>[{x:.045,y:.045},{x:.955,y:.045},{x:.955,y:.955},{x:.045,y:.955}];

  /* ── cámara ── */
  async function startCamera(){
    showStage('camera');updateCount();
    if(!navigator.mediaDevices?.getUserMedia){q('[data-role="fallback"]').click();return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},aspectRatio:{ideal:16/9}}});
      if(!R){stream.getTracks().forEach(t=>t.stop());return}
      S.stream=stream;
      const track=stream.getVideoTracks()[0],caps=track.getCapabilities?.()||{};
      const video=q('video');video.srcObject=stream;await video.play();
      q('[data-act="torch"]').hidden=!caps.torch;
      if(caps.zoom&&caps.zoom.min!=null)track.applyConstraints({advanced:[{zoom:caps.zoom.min}]}).catch(()=>{});   // sin zoom digital: se ve toda la escena
      if(caps.focusMode?.includes?.('continuous'))track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{});
      if(typeof ImageCapture==='function')try{S.imageCapture=new ImageCapture(track)}catch(_){S.imageCapture=null}
      S.capturing=false;S.smoothed=null;S.stable=0;
      runLive(++S.token);
    }catch(e){
      stopCamera();say('No fue posible abrir la cámara ('+(e.message||e.name)+'). Toma la foto con la cámara del teléfono.');
      q('[data-role="fallback"]').click();
    }
  }
  function stopCamera(){
    if(!S)return;
    S.token++;S.live=null;S.smoothed=null;S.stable=0;
    if(S.stream){S.stream.getTracks().forEach(t=>t.stop());S.stream=null}
    S.imageCapture=null;S.torchOn=false;
    const v=R&&q('video');if(v)v.srcObject=null;
  }
  function updateCount(){
    const n=S.pages.length;
    q('[data-role="count"]').textContent=String(n);
    q('[data-act="finish"]').hidden=!n;
  }
  function toggleAuto(){
    S.auto=!S.auto;S.stable=0;
    const b=q('[data-act="auto"]');b.classList.toggle('on',S.auto);b.setAttribute('aria-pressed',String(S.auto));b.textContent=S.auto?'Auto ✓':'Auto';
  }
  async function toggleTorch(){
    const track=S.stream?.getVideoTracks()[0];if(!track)return;
    try{S.torchOn=!S.torchOn;await track.applyConstraints({advanced:[{torch:S.torchOn}]});q('[data-act="torch"]').classList.toggle('on',S.torchOn)}
    catch(_){S.torchOn=false;q('[data-act="torch"]').classList.remove('on');setHint('Este teléfono no permite encender la linterna desde el navegador.')}
  }
  function guideCorners(){
    const panel=q('.gs150-cam').getBoundingClientRect(),guide=q('.gs150-outline').getBoundingClientRect(),v=q('video');
    if(!v.videoWidth||!panel.width)return defaultCorners();
    const f=Math.min(panel.width/v.videoWidth,panel.height/v.videoHeight),w=v.videoWidth*f,h=v.videoHeight*f,ox=(panel.width-w)/2,oy=(panel.height-h)/2;
    const X=x=>clamp(((x-panel.left)-ox)/w,0,1),Y=y=>clamp(((y-panel.top)-oy)/h,0,1);
    return[{x:X(guide.left),y:Y(guide.top)},{x:X(guide.right),y:Y(guide.top)},{x:X(guide.right),y:Y(guide.bottom)},{x:X(guide.left),y:Y(guide.bottom)}];
  }
  function drawContour(found,progress){
    const overlay=q('.gs150-edges'),panel=q('.gs150-cam'),v=q('video');
    const rect=panel.getBoundingClientRect(),ratio=window.devicePixelRatio||1,w=rect.width,h=rect.height;
    overlay.width=Math.round(w*ratio);overlay.height=Math.round(h*ratio);
    const ctx=overlay.getContext('2d');ctx.scale(ratio,ratio);
    if(!found||!v.videoWidth)return;
    const f=Math.min(w/v.videoWidth,h/v.videoHeight),iw=v.videoWidth*f,ih=v.videoHeight*f,ox=(w-iw)/2,oy=(h-ih)/2;
    const pts=found.map(p=>({x:ox+p.x*iw,y:oy+p.y*ih}));
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle='rgba(247,147,30,'+(.10+.14*progress)+')';ctx.fill();
    ctx.lineWidth=4;ctx.strokeStyle='#F7931E';ctx.shadowColor='#101b27';ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;
    pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.stroke()});
  }
  function updateDetection(found,progress,cut){
    setHint(found?(cut?'Aléjate un poco: la hoja no cabe completa':S.auto?(progress>0?'Mantén firme…':'Hoja detectada'):'Hoja detectada · toca capturar'):'Centra la hoja completa en la pantalla');
    q('[data-role="detect"]').innerHTML=found?'Bordes<br>detectados':'Buscando<br>bordes…';
    q('.gs150-outline').classList.toggle('detected',!!found);
    q('[data-role="ring"]').style.setProperty('--p',String(progress));
    drawContour(found,progress);
  }
  function runLive(token){
    const v=q('video');let timer=null;
    function tick(){
      if(!R||!S||token!==S.token||!S.stream||!v.videoWidth){clearTimeout(timer);return}
      let progress=0,shown=null;
      if(!document.hidden&&!S.capturing)try{
        const res=Scan().detect(v,{maxSide:280,prefer:S.smoothed}),found=res&&res.confidence>=.3?res:null,cut=!!(found&&found.cut&&found.cut.length);
        if(found){
          const moved=S.smoothed?Math.max(...found.corners.map((p,i)=>distance(p,S.smoothed[i]))):1;
          if(!S.smoothed||moved>.08)S.smoothed=found.corners.map(p=>({...p}));
          else S.smoothed=S.smoothed.map((p,i)=>({x:p.x*.5+found.corners[i].x*.5,y:p.y*.5+found.corners[i].y*.5}));
          S.stable=moved<.03?S.stable+1:0;
          S.live=S.smoothed.map(p=>({...p}));S.liveAt=performance.now();
          shown=S.smoothed;
          const need=cut?STABLE_TICKS_CUT:STABLE_TICKS;
          progress=S.auto&&found.confidence>=.4?(cut&&S.stable<need?0:Math.min(1,S.stable/need)):0;
          if(progress>=1){updateDetection(shown,1,cut);capture();return}
        }else{S.smoothed=null;S.stable=0;S.live=null;S.liveAt=0}
        updateDetection(shown,progress,cut);
      }catch(e){console.warn('GS Docs v150 detección:',e)}
      timer=setTimeout(tick,230);
    }
    tick();
  }
  async function capture(){
    const v=q('video');
    if(!S.stream&&!S.capturing){q('[data-role="fallback"]').click();return}   // sin cámara en vivo: usa la cámara del teléfono
    if(!S.stream||S.capturing||!v.videoWidth)return;
    S.capturing=true;
    const live=S.live&&performance.now()-S.liveAt<1600?S.live.map(p=>({...p})):null,guide=guideCorners(),aspect=v.videoWidth/v.videoHeight;
    // Lo que la persona ve en este instante: sirve para ubicar su encuadre dentro de la foto del sensor
    // (que suele abarcar más escena que la vista previa) o como respaldo si no coinciden.
    const frame=document.createElement('canvas');frame.width=v.videoWidth;frame.height=v.videoHeight;
    frame.getContext('2d').drawImage(v,0,0);
    let photo=null;
    if(S.imageCapture)try{photo=await Promise.race([S.imageCapture.takePhoto(),new Promise((_,f)=>setTimeout(()=>f(Error('tiempo')),3500))])}catch(_){photo=null}
    navigator.vibrate?.(25);
    stopCamera();
    let hint={live,guide,aspect};
    if(photo)try{
      const small=await canvasFromImage(photo,720),pa=small.width/small.height;
      const reg=Scan().registerView(frame,small);
      if(reg)hint={live:live&&Scan().mapToPhoto(reg,live),guide:Scan().mapToPhoto(reg,guide),aspect:pa};
      else if(Math.abs(pa-aspect)/aspect>=.03)photo=null;   // otro encuadre y sin coincidencia fiable: se usa el cuadro de video
      small.width=small.height=1;
    }catch(_){photo=null}
    if(!photo){photo=await makeJpeg(frame,.93).catch(()=>null);hint={live,guide,aspect}}
    frame.width=frame.height=1;
    if(!photo){say('No fue posible capturar la foto.');startCamera();return}
    loadPhoto(photo,hint);
  }

  /* ── edición de la hoja ── */
  function resetPhoto(){
    if(!S)return;
    if(S.source)S.source.width=S.source.height=1;
    if(S.base.canvas)S.base.canvas.width=S.base.canvas.height=1;
    S.base={key:'',canvas:null};S.source=null;S.sourceData=null;S.corners=null;S.ready=false;S.seq++;S.cornerIndex=-1;
  }
  async function loadPhoto(file,hint){
    resetPhoto();showStage('edit');
    q('[data-role="manual"]').hidden=true;q('[data-act="addpage"]').disabled=true;
    q('[data-role="edithint"]').textContent='Detectando bordes…';
    try{
      S.source=await canvasFromImage(file);
      await nextFrame();
      const res=Scan().detect(S.source,{refine:true}),detected=res&&res.confidence>=.3?res.corners:null;
      const same=hint&&hint.aspect&&Math.abs(S.source.width/S.source.height-hint.aspect)/hint.aspect<.03;
      const live=same?hint.live:null;
      let chosen=detected;
      if(live){
        const G=Scan(),liveFit=G.refine(S.source,live);
        if(!detected)chosen=liveFit;
        // Si la detección sobre la foto completa abarca mucho más que lo que se veía en pantalla, probablemente
        // juntó la hoja con otra vecina: se respeta el encuadre de la persona.
        else if(G.polyIoU(liveFit,detected)<.75&&Math.abs(G.polyArea(detected))>Math.abs(G.polyArea(liveFit))*1.5)chosen=liveFit;
      }
      S.corners=chosen||(same?hint.guide:null)||defaultCorners();
      S.automatic=!!chosen;
      S.filter='enhance';R.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter==='enhance'));
      const uncertain=!chosen;
      q('[data-role="manual"]').hidden=!uncertain;
      if(uncertain)drawCorners();
      await refreshPreview();
      if(uncertain)q('[data-role="manual"]').scrollIntoView({block:'center',behavior:'smooth'});
    }catch(e){
      q('[data-role="edithint"]').textContent='No se pudo abrir la imagen: '+(e.message||e);
    }
  }
  const cornerKey=()=>S.corners.map(p=>p.x.toFixed(4)+','+p.y.toFixed(4)).join('|')+'@'+S.source.width+'x'+S.source.height;
  async function previewBase(){
    const key=cornerKey();
    if(S.base.key===key&&S.base.canvas)return S.base.canvas;
    const size=Scan().estimateSize(S.corners,S.source.width,S.source.height,{maxSide:900,maxPixels:700000});
    const canvas=await Scan().warp(getSourceData(),S.corners,size.w,size.h,{yieldFn:nextFrame});
    if(S.base.canvas)S.base.canvas.width=S.base.canvas.height=1;
    S.base={key,canvas};return canvas;
  }
  async function refreshPreview(){
    if(!S||!S.source)return;
    const seq=++S.seq,photo=S.source,effect=S.filter;
    S.ready=false;q('[data-act="addpage"]').disabled=true;
    q('[data-role="edithint"]').textContent='Preparando vista previa…';
    try{
      const base=await previewBase();
      if(!S||seq!==S.seq||S.source!==photo)return;
      const work=document.createElement('canvas');work.width=base.width;work.height=base.height;
      work.getContext('2d',{willReadFrequently:true}).drawImage(base,0,0);
      await Scan().enhance(work,effect,nextFrame);
      if(!S||seq!==S.seq||S.source!==photo){work.width=work.height=1;return}
      const p=q('[data-role="preview"]');p.width=work.width;p.height=work.height;
      p.getContext('2d').drawImage(work,0,0);work.width=work.height=1;
      S.ready=true;q('[data-act="addpage"]').disabled=false;
      q('[data-role="edithint"]').textContent=S.automatic?'Recorte automático · revisa los bordes':'Recorte aproximado · ajusta las esquinas si hace falta';
    }catch(e){if(S&&seq===S.seq)q('[data-role="edithint"]').textContent='No se pudo preparar la imagen: '+(e.message||e)}
  }
  function turnSheet(){
    if(!S.source)return;
    S.corners=[S.corners[3],S.corners[0],S.corners[1],S.corners[2]];   // gira 90° sin tocar la foto
    if(!q('[data-role="manual"]').hidden)drawCorners();
    refreshPreview();
  }
  function autoBounds(){
    if(!S.source)return;
    const res=Scan().detect(S.source,{refine:true}),found=res&&res.confidence>=.3?res.corners:null;
    if(found){S.corners=found;S.automatic=true}
    drawCorners();
    setHint2(found?'Bordes detectados. Verifica las cuatro esquinas.':'No se detectó un contorno confiable. Ajusta manualmente los puntos.');
  }
  const setHint2=t=>{q('[data-role="edithint"]').textContent=t};
  function resetBounds(){if(S.source){S.corners=defaultCorners();S.automatic=false;drawCorners()}}
  function doneCorners(){q('[data-role="manual"]').hidden=true;S.automatic=false;refreshPreview();q('.gs150-edit .gs150-body').scrollTo({top:0,behavior:'smooth'})}
  function normalized(ev){
    const r=q('[data-role="crop"]').getBoundingClientRect();
    return{x:clamp((ev.clientX-r.left)/r.width,0,1),y:clamp((ev.clientY-r.top)/r.height,0,1)};
  }
  function drawCorners(){
    if(!S||!S.source)return;
    const crop=q('[data-role="crop"]'),pen=crop.getContext('2d',{willReadFrequently:true}),area=q('.gs150-surface');
    const maxW=Math.max(250,area.clientWidth||320);
    const k=Math.min(maxW/S.source.width,Math.min(innerHeight*.58,640)/S.source.height,1);
    crop.width=Math.max(1,Math.round(S.source.width*k));crop.height=Math.max(1,Math.round(S.source.height*k));
    pen.drawImage(S.source,0,0,crop.width,crop.height);
    const c=S.corners.map(p=>({x:p.x*crop.width,y:p.y*crop.height}));
    pen.fillStyle='rgba(14,36,60,.30)';pen.fillRect(0,0,crop.width,crop.height);
    pen.save();pen.beginPath();pen.moveTo(c[0].x,c[0].y);for(let i=1;i<4;i++)pen.lineTo(c[i].x,c[i].y);
    pen.closePath();pen.clip();pen.clearRect(0,0,crop.width,crop.height);pen.drawImage(S.source,0,0,crop.width,crop.height);pen.restore();
    pen.strokeStyle='#F7931E';pen.lineWidth=3;pen.beginPath();pen.moveTo(c[0].x,c[0].y);for(let i=1;i<4;i++)pen.lineTo(c[i].x,c[i].y);pen.closePath();pen.stroke();
    c.forEach((p,i)=>{
      pen.beginPath();pen.arc(p.x,p.y,10,0,Math.PI*2);pen.fillStyle='#fff';pen.fill();pen.strokeStyle='#F7931E';pen.lineWidth=3;pen.stroke();
      pen.fillStyle='#073A78';pen.font='bold 12px sans-serif';pen.fillText(String(i+1),p.x+11,p.y-11);
    });
    if(S.cornerIndex>=0)drawLoupe(pen,crop,c[S.cornerIndex]);
  }
  function drawLoupe(pen,crop,pt){
    const r=Math.min(58,crop.width*.2),zoom=3,sw=S.source.width/crop.width,sh=S.source.height/crop.height;
    let cx=pt.x,cy=pt.y-r-34;if(cy-r<4)cy=pt.y+r+34;
    cx=clamp(cx,r+4,crop.width-r-4);cy=clamp(cy,r+4,crop.height-r-4);
    pen.save();pen.beginPath();pen.arc(cx,cy,r,0,Math.PI*2);pen.clip();pen.fillStyle='#fff';pen.fillRect(cx-r,cy-r,r*2,r*2);
    const w=(r*2/zoom)*sw,h=(r*2/zoom)*sh;
    pen.drawImage(S.source,pt.x*sw-w/2,pt.y*sh-h/2,w,h,cx-r,cy-r,r*2,r*2);pen.restore();
    pen.strokeStyle='#F7931E';pen.lineWidth=3;pen.beginPath();pen.arc(cx,cy,r,0,Math.PI*2);pen.stroke();
    pen.lineWidth=1.5;pen.beginPath();pen.moveTo(cx-10,cy);pen.lineTo(cx+10,cy);pen.moveTo(cx,cy-10);pen.lineTo(cx,cy+10);pen.stroke();
  }
  function retake(){resetPhoto();startCamera()}

  /* ── hojas y PDF ── */
  async function makeThumb(blob){
    const src=await canvasFromImage(blob,360),t=await makeJpeg(src,.8);src.width=src.height=1;return URL.createObjectURL(t);
  }
  async function addPage(){
    if(!S.source||!S.ready)return;
    const btn=q('[data-act="addpage"]');btn.disabled=true;setHint2('Generando hoja en alta calidad…');await nextFrame();
    try{
      const size=Scan().estimateSize(S.corners,S.source.width,S.source.height,{maxSide:2480,maxPixels:4300000});
      const page=await Scan().warp(getSourceData(),S.corners,size.w,size.h,{yieldFn:nextFrame});
      await Scan().enhance(page,S.filter,nextFrame);
      const blob=await makeJpeg(page,.9);
      S.pages.push({blob,w:page.width,h:page.height,std:size.std,thumb:await makeThumb(blob)});
      page.width=page.height=1;
      resetPhoto();showPages();
    }catch(e){setHint2('No se pudo preparar la hoja: '+(e.message||e));btn.disabled=false}
  }
  function defaultFileName(){
    const d=new Date(),p=n=>String(n).padStart(2,'0');
    return 'SOPORTE_ESCANEO_'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes());
  }
  function showPages(){
    showStage('pages');
    const host=q('[data-role="thumbs"]');host.replaceChildren();
    S.pages.forEach((pg,i)=>{
      const c=document.createElement('div');c.className='gs150-thumb';
      const img=document.createElement('img');img.src=pg.thumb;img.alt='Hoja '+(i+1);
      const del=document.createElement('button');del.type='button';del.className='gs150-del';del.textContent='×';del.setAttribute('aria-label','Quitar hoja '+(i+1));
      del.onclick=()=>{URL.revokeObjectURL(pg.thumb);S.pages.splice(i,1);if(S.pages.length)showPages();else startCamera()};
      const n=document.createElement('div');n.className='gs150-name';n.textContent='Hoja '+(i+1)+(pg.std?' · '+pg.std:'');
      c.append(img,del,n);host.append(c);
    });
    q('[data-role="pagesinfo"]').textContent=S.pages.length+' hoja(s)';
    const f=q('[data-role="filename"]');if(!f.value)f.value=defaultFileName();
    updateCount();
  }
  function moreSheets(){startCamera()}
  function finishCapture(){if(S.pages.length){stopCamera();showPages()}}
  function pageBox(p){
    const portrait=p.h>=p.w,std=p.std&&PDF_SIZES[p.std];
    if(std)return portrait?std:[std[1],std[0]];
    const long=Math.max(p.w,p.h),short=Math.min(p.w,p.h),k=Math.min(841.89/long,595.28/short);
    return[p.w*k,p.h*k];
  }
  async function savePdf(){
    if(!S.pages.length)return;
    const btn=q('[data-act="save"]');btn.disabled=true;
    if(!globalThis.PDFLib){say('El motor PDF no está disponible. Comprueba tu conexión e inténtalo de nuevo.');btn.disabled=false;return}
    try{
      const pdf=await PDFLib.PDFDocument.create();
      pdf.setTitle('Soporte escaneado');pdf.setCreator('GS Documentos');pdf.setProducer('GS Documentos');
      for(const pg of S.pages){
        const img=await pdf.embedJpg(new Uint8Array(await pg.blob.arrayBuffer()));
        const [w,h]=pageBox(pg),sheet=pdf.addPage([w,h]);
        sheet.drawImage(img,{x:0,y:0,width:w,height:h});
        await nextFrame();
      }
      const bytes=await pdf.save();
      let name=safeName(q('[data-role="filename"]').value.trim()||defaultFileName()).replace(/\.pdf$/i,'');
      const file=new File([bytes],name+'.pdf',{type:'application/pdf',lastModified:Date.now()});
      const thumb=await makeThumb(S.pages[0].blob),count=S.pages.length;
      addFiles([file],{fromScan:true,thumb,pages:count});
      say('✅ Escaneo guardado en Soportes ('+count+' hoja(s))');
      S.pages.splice(0).forEach(p=>URL.revokeObjectURL(p.thumb));
      closeScanner(true);
    }catch(e){say('No se pudo generar el PDF: '+(e.message||e));btn.disabled=false}
  }

  // Si el usuario sale de la app con la cámara abierta, se libera la cámara.
  addEventListener('pagehide',()=>{try{stopCamera()}catch(_){}});
  try{ensureUI()}catch(e){console.warn('GS Docs v150',e)}
})();
