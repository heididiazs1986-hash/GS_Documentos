/* GS · Recorte de la foto de la firma
 * Antes de quitar el fondo, la persona encuadra solo la firma (sin textos impresos, renglones ni bordes de la hoja).
 * Uso: GS_RECORTE.open(dataURL) -> Promise<dataURL recortada | null si cancela>. Funciona con el dedo y con el mouse. */
(function(){
  'use strict';
  if(globalThis.GS_RECORTE) return;
  const MAXSIDE=2400, MIN=.06;
  const css=`
  .gsr{position:fixed;inset:0;z-index:2147483000;background:#0f1419;color:#fff;display:flex;flex-direction:column;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none}
  .gsr h2{margin:0;padding:calc(12px + env(safe-area-inset-top)) 16px 4px;font-size:17px;font-weight:800}
  .gsr p{margin:0;padding:0 16px 10px;font-size:13px;color:#b9c4cf;line-height:1.35}
  .gsr .st{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;padding:6px 14px;overflow:hidden}
  .gsr .wrap{position:relative;line-height:0}
  .gsr img{display:block;max-width:100%;max-height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}
  .gsr .sel{position:absolute;border:2px solid #ff6600;box-shadow:0 0 0 9999px rgba(8,12,16,.62);cursor:move;box-sizing:border-box}
  .gsr .sel i{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;display:block}
  .gsr .sel i::after{content:"";position:absolute;left:8px;top:8px;width:14px;height:14px;border-radius:50%;background:#ff6600;border:2px solid #fff;box-sizing:border-box}
  .gsr .sel i.e{cursor:ew-resize}.gsr .sel i.n{cursor:ns-resize}.gsr .sel i.c{cursor:nwse-resize}
  .gsr .lvl{display:flex;align-items:center;gap:8px;padding:8px 14px 2px;background:#161d24}
  .gsr .lvl b{min-width:58px;white-space:nowrap;text-align:center;font-size:14px}
  .gsr .lvl input{flex:1;height:34px;margin:0;accent-color:#ff6600;background:repeating-linear-gradient(90deg,#46525e 0 2px,transparent 2px 5.55%) center/100% 10px no-repeat}
  .gsr .lvl button{flex:0 0 46px;min-height:40px;font-size:18px;padding:0}
  .gsr .bar{display:flex;gap:8px;padding:10px 14px calc(12px + env(safe-area-inset-bottom));background:#161d24}
  .gsr button{flex:1;min-height:46px;border:0;border-radius:12px;font:700 15px system-ui,sans-serif;cursor:pointer;color:#fff;background:#2b3641}
  .gsr button.ok{background:#ff6600;color:#14181d;flex:1.6}
  .gsr button:active{filter:brightness(1.15)}`;
  function injectCss(){ if(document.getElementById('gsr-css')) return; const s=document.createElement('style'); s.id='gsr-css'; s.textContent=css; document.head.appendChild(s); }

  function open(src){
    return new Promise(resolve=>{
      injectCss();
      const img=new Image();
      img.onerror=()=>resolve(src);               // si no se puede mostrar, se sigue con la imagen completa
      img.onload=()=>{
        img.onload=null;                             // al girar se cambia img.src: que no se abra otra ventana
        const orig=img, ow=img.naturalWidth||img.width, oh=img.naturalHeight||img.height;
        if(!ow||!oh){ resolve(src); return; }
        let iw=ow, ih=oh, ang=0, q=0;                // ang: nivel fino (°), q: giros de 90°
        const isPng=/^data:image\/png/i.test(src);
        const rotCanvas=cap=>{
          const deg=ang+q*90; if(!deg) return null;
          const t=deg*Math.PI/180, c=Math.abs(Math.cos(t)), s=Math.abs(Math.sin(t));
          let w=ow*c+oh*s, h=ow*s+oh*c, k=Math.min(1,cap/Math.max(w,h));
          const cv=document.createElement('canvas'); cv.width=Math.max(8,Math.round(w*k)); cv.height=Math.max(8,Math.round(h*k));
          const x=cv.getContext('2d'); if(!isPng){ x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); }
          x.translate(cv.width/2,cv.height/2); x.rotate(t); x.scale(k,k); x.drawImage(orig,-ow/2,-oh/2);
          return cv;
        };
        const ov=document.createElement('div'); ov.className='gsr'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
        ov.innerHTML='<h2>Recorta la firma</h2><p>Nivela la foto con la barra (o gira 90°) y ajusta el recuadro naranja para dejar solo la firma, sin textos impresos ni bordes.</p><div class="st"><div class="wrap"></div></div><div class="lvl"><button type="button" data-a="l90" aria-label="Girar 90 a la izquierda">↺</button><input type="range" min="-45" max="45" step="0.5" value="0" aria-label="Nivelar"><b>0°</b><button type="button" data-a="r90" aria-label="Girar 90 a la derecha">↻</button></div><div class="bar"><button type="button" data-a="cancel">Cancelar</button><button type="button" data-a="full">Sin recortar</button><button type="button" class="ok" data-a="ok">Usar recorte</button></div>';
        const wrap=ov.querySelector('.wrap'); wrap.appendChild(img);
        const rng=ov.querySelector('input[type=range]'), lbl=ov.querySelector('.lvl b');
        let tick=0;
        const apply=()=>{ const cv=rotCanvas(1400); const v=cv?cv.toDataURL('image/jpeg',.8):src; const my=++tick; const p=new Image(); p.onload=()=>{ if(my===tick){ img.src=v; iw=cv?cv.width:ow; ih=cv?cv.height:oh; } }; p.src=v; lbl.textContent=(ang+q*90).toFixed(ang%1?1:0).replace(/^-0$/,'0')+'°'; };
        rng.addEventListener('input',()=>{ ang=+rng.value; apply(); });
        rng.addEventListener('dblclick',()=>{ rng.value=0; ang=0; apply(); });
        const sel=document.createElement('div'); sel.className='sel';
        const hs=[['nw','c',0,0],['n','n',.5,0],['ne','c',1,0],['e','e',1,.5],['se','c',1,1],['s','n',.5,1],['sw','c',0,1],['w','e',0,.5]];
        hs.forEach(([k,cls,px,py])=>{const i=document.createElement('i'); i.dataset.h=k; i.className=cls; i.style.left=(px*100)+'%'; i.style.top=(py*100)+'%'; sel.appendChild(i);});
        wrap.appendChild(sel);
        document.body.appendChild(ov);
        const prevOverflow=document.documentElement.style.overflow; document.documentElement.style.overflow='hidden';

        let f={x:.04,y:.04,w:.92,h:.92};              // recuadro en fracciones de la imagen
        const paint=()=>{ sel.style.left=(f.x*100)+'%'; sel.style.top=(f.y*100)+'%'; sel.style.width=(f.w*100)+'%'; sel.style.height=(f.h*100)+'%'; };
        paint();

        let drag=null;
        sel.addEventListener('pointerdown',e=>{
          const h=e.target.dataset&&e.target.dataset.h||'move';
          const r=img.getBoundingClientRect(); if(!r.width||!r.height) return;
          drag={h,x0:e.clientX,y0:e.clientY,f0:{...f},rw:r.width,rh:r.height};
          try{sel.setPointerCapture(e.pointerId)}catch(_){}
          e.preventDefault();
        });
        sel.addEventListener('pointermove',e=>{
          if(!drag) return;
          const dx=(e.clientX-drag.x0)/drag.rw, dy=(e.clientY-drag.y0)/drag.rh, o=drag.f0, h=drag.h;
          let x1=o.x,y1=o.y,x2=o.x+o.w,y2=o.y+o.h;
          if(h==='move'){ const w=o.w,hh=o.h; x1=Math.min(1-w,Math.max(0,o.x+dx)); y1=Math.min(1-hh,Math.max(0,o.y+dy)); x2=x1+w; y2=y1+hh; }
          else{
            if(h.includes('w')) x1=Math.min(x2-MIN,Math.max(0,o.x+dx));
            if(h.includes('e')) x2=Math.max(x1+MIN,Math.min(1,o.x+o.w+dx));
            if(h.includes('n')) y1=Math.min(y2-MIN,Math.max(0,o.y+dy));
            if(h.includes('s')) y2=Math.max(y1+MIN,Math.min(1,o.y+o.h+dy));
          }
          f={x:x1,y:y1,w:x2-x1,h:y2-y1}; paint(); e.preventDefault();
        });
        const end=()=>{drag=null};
        sel.addEventListener('pointerup',end); sel.addEventListener('pointercancel',end);

        const close=v=>{ document.documentElement.style.overflow=prevOverflow; ov.remove(); resolve(v); };
        const crop=()=>{
          const big=rotCanvas(4000); const srcEl=big||img; if(big){ iw=big.width; ih=big.height; } else { iw=ow; ih=oh; }
          const sx=Math.round(f.x*iw), sy=Math.round(f.y*ih), sw=Math.max(8,Math.round(f.w*iw)), sh=Math.max(8,Math.round(f.h*ih));
          const k=Math.min(1,MAXSIDE/Math.max(sw,sh)), w=Math.max(8,Math.round(sw*k)), h=Math.max(8,Math.round(sh*k));
          const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
          const png=isPng;
          if(!png){ x.fillStyle='#fff'; x.fillRect(0,0,w,h); }
          x.drawImage(srcEl,sx,sy,sw,sh,0,0,w,h);
          return png?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.93);
        };
        ov.addEventListener('click',e=>{
          const a=e.target.dataset&&e.target.dataset.a; if(!a) return;
          if(a==='l90'||a==='r90'){ q+=a==='l90'?-1:1; apply(); return; }
          if(a==='cancel') close(null); else if(a==='full'){ if(ang||q){ f={x:0,y:0,w:1,h:1}; try{ close(crop()); }catch(_){ close(src); } } else close(src); } else { try{ close(crop()); }catch(err){ console.warn('GS recorte:',err); close(src); } }
        });
        ov.addEventListener('keydown',e=>{ if(e.key==='Escape') close(null); });
      };
      img.src=src;
    });
  }
  globalThis.GS_RECORTE={open,version:'v174'};
})();
