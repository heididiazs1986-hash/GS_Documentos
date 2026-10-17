/* GS Documentos v137 - auditoría de campo y respaldo no destructivo.
   No infiere fechas ni datos GPS de registros antiguos. */
(()=>{
'use strict';
if(window.__GS_V137_AUDIT__)return;
window.__GS_V137_AUDIT__=true;
const RKEY='GS_DOCS_REGISTROS_V1',SKEY='GS_DOCS_V49';
const rawSet=Storage.prototype.setItem,rawGet=Storage.prototype.getItem,rawRemove=Storage.prototype.removeItem;
let recentGPS=null,draftStartedAt='',exporting=false,gpsHooked=false;
const now=()=>new Date().toISOString();
const localDate=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
const read=(key,fallback)=>{try{return JSON.parse(rawGet.call(localStorage,key)||'null')??fallback}catch(_){return fallback}};
const state=()=>read(SKEY,{}),rows=()=>read(RKEY,[]);
const numeric=n=>n!==null&&n!==''&&Number.isFinite(Number(n));
const colombia=(lat,lon)=>numeric(lat)&&numeric(lon)&&Number(lat)>=-5&&Number(lat)<=17&&Number(lon)>=-83&&Number(lon)<=-66;
const coordMatch=(r,g)=>!!g&&colombia(r.latitud,r.longitud)&&Math.abs(Number(r.latitud)-Number(g.lat))<0.00000011&&Math.abs(Number(r.longitud)-Number(g.lon))<0.00000011;
try{
  const geo=navigator.geolocation;
  if(geo){
    const proto=Object.getPrototypeOf(geo),original=geo.getCurrentPosition;
    const wrapped=function(success,error,options){
      return original.call(this,pos=>{
        const {latitude,longitude,accuracy}=pos.coords||{};
        if(!colombia(latitude,longitude)||!numeric(accuracy)||Number(accuracy)<0){
          const message='GPS fuera de Colombia o precisión inválida. Repite la captura; no se modificaron coordenadas.';
          if(typeof error==='function')error({code:2,message});else alert(message);
          return;
        }
        const tm=new Date(Number(pos.timestamp)||Date.now());
        recentGPS={lat:Number(latitude),lon:Number(longitude),accuracy:Number(accuracy),
          obtainedAt:Number.isFinite(tm.getTime())?tm.toISOString():now(),
          savedAt:now(),zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',
          order:String(state().registration?.orden_ro||'').trim(),used:false};
        success(pos);
      },error,options);
    };
    try{geo.getCurrentPosition=wrapped}catch(_){}
    if(geo.getCurrentPosition!==wrapped)proto.getCurrentPosition=wrapped;
    gpsHooked=geo.getCurrentPosition===wrapped;
  }
}catch(e){console.error('GS v137: no pudo instrumentarse GPS',e)}

Storage.prototype.setItem=function(key,value){
  if(this!==localStorage)return rawSet.call(this,key,value);
  if(key===SKEY){
    try{
      const s=JSON.parse(value);
      if(s.role==='tecnico'&&!s.editingRecordId&&!s.currentRecord?.id_registro&&s.screen==='register'&&!draftStartedAt)draftStartedAt=now();
    }catch(_){}
    return rawSet.call(this,key,value);
  }
  if(key!==RKEY)return rawSet.call(this,key,value);
  let incoming;
  try{incoming=JSON.parse(value)}catch(e){throw new Error('No se pudo interpretar el registro antes de guardarlo')}
  if(!Array.isArray(incoming))throw new Error('Los registros deben ser una lista');
  const previous=rows();
  if(previous.length&&incoming.length<previous.length){
    throw new Error('Protección de registros: se bloqueó una limpieza automática. Exporta una copia antes de cualquier eliminación.');
  }
  const prior=new Map(previous.map(r=>[String(r.id_registro||''),r]));
  const s=state();
  let consumed=false;
  const output=incoming.map(entry=>{
    if(!entry||typeof entry!=='object')return entry;
    const r={...entry},old=prior.get(String(r.id_registro||''));
    const field=(r.rol||s.role)==='tecnico';
    const targetId=String(s.editingRecordId||s.currentRecord?.id_registro||'');
    const newReading=recentGPS&&!recentGPS.used&&coordMatch(r,recentGPS)&&
      recentGPS.order===String(r.orden_ro||'').trim()&&(!old||(targetId&&String(r.id_registro)===targetId));
    if(old){
      if(old.fecha_hora_creacion)r.fecha_hora_creacion=old.fecha_hora_creacion;
      for(const key of ['gs_inicio_captura','gs_origen_coordenadas','gs_gps_fecha_hora_utc',
        'gs_gps_guardado_utc','gs_gps_precision_m','gs_gps_latitud_original',
        'gs_gps_longitud_original','gs_gps_huso_dispositivo','gs_historial_gps']){
        if(old[key]!==undefined)r[key]=old[key];
      }
    }
    if(!old&&field){
      if(!gpsHooked||!newReading)throw new Error('Debes capturar el GPS del predio antes de guardar este nuevo registro.');
      r.fecha_registro=localDate();
      r.gs_inicio_captura=draftStartedAt||r.fecha_hora_creacion||now();
    }
    if(newReading){
      const reading={fecha_hora_utc:recentGPS.obtainedAt,latitud:recentGPS.lat,
        longitud:recentGPS.lon,precision_m:recentGPS.accuracy,
        origen:'GPS_DISPOSITIVO',huso_dispositivo:recentGPS.zone};
      r.gs_origen_coordenadas='GPS_DISPOSITIVO';
      r.gs_gps_fecha_hora_utc=recentGPS.obtainedAt;
      r.gs_gps_guardado_utc=recentGPS.savedAt;
      r.gs_gps_precision_m=recentGPS.accuracy;
      r.gs_gps_latitud_original=recentGPS.lat;
      r.gs_gps_longitud_original=recentGPS.lon;
      r.gs_gps_huso_dispositivo=recentGPS.zone;
      r.gs_historial_gps=[...(Array.isArray(old?.gs_historial_gps)?old.gs_historial_gps:[]),reading];
      consumed=true;
    }else if(old&&field&&old.gs_origen_coordenadas==='GPS_DISPOSITIVO'&&
             !coordMatch(r,{lat:old.gs_gps_latitud_original,lon:old.gs_gps_longitud_original})){
      throw new Error('Coordenadas modificadas sin una nueva captura GPS. Registro conservado.');
    }
    if(!old&&!field&&colombia(r.latitud,r.longitud)&&!r.gs_origen_coordenadas){
      r.gs_origen_coordenadas='IMPORTADO_O_MANUAL_SIN_GPS';
    }
    return r;
  });
  const result=rawSet.call(this,key,JSON.stringify(output));
  if(consumed){recentGPS.used=true;recentGPS=null;draftStartedAt=''}
  return result;
};
// Las versiones antiguas podían borrar la lista al cerrar; prohibirlo también por removeItem.
Storage.prototype.removeItem=function(key){
  if(this===localStorage&&(key===RKEY||key===SKEY)){
    console.warn('GS v137: limpieza de datos locales bloqueada',key);
    return;
  }
  return rawRemove.call(this,key);
};
function validFieldRecord(){
  const s=state(),r=s.registration||{};
  if(s.role!=='tecnico')return true;
  const previous=rows().find(x=>x.id_registro&&x.id_registro===(s.editingRecordId||s.currentRecord?.id_registro));
  if(!gpsHooked)return false;
  if(recentGPS&&!recentGPS.used&&coordMatch(r,recentGPS)&&recentGPS.order===String(r.orden_ro||'').trim())return true;
  return !!previous&&previous.gs_origen_coordenadas==='GPS_DISPOSITIVO'&&
    coordMatch(r,{lat:previous.gs_gps_latitud_original,lon:previous.gs_gps_longitud_original});
}
function protectInputs(){
  const s=state();if(s.role!=='tecnico')return;
  const isNew=!s.editingRecordId&&!s.currentRecord?.id_registro;
  for(const id of ['reg_fecha','reg_lat','reg_lon']){
    const el=document.getElementById(id);if(!el)continue;
    if(!el.readOnly)el.readOnly=true;
    if(!el.hasAttribute('readonly'))el.setAttribute('readonly','');
    if(el.getAttribute('inputmode')!=='none')el.setAttribute('inputmode','none');
    if(id==='reg_fecha'&&isNew&&el.value!==localDate())el.value=localDate();
  }
  const anchor=document.getElementById('gpsBtn');
  if(anchor){
    let note=document.getElementById('gs137AuditNote');
    if(!note){
      note=document.createElement('small');note.id='gs137AuditNote';
      note.style.cssText='display:block;margin-top:8px;line-height:1.5';
      anchor.parentElement?.append(note);
    }
    const r=s.registration||{};
    const captured=recentGPS&&!recentGPS.used&&coordMatch(r,recentGPS)&&recentGPS.order===String(r.orden_ro||'').trim();
    const prev=rows().find(x=>x.id_registro===(s.editingRecordId||s.currentRecord?.id_registro));
    const src=captured?'GPS del dispositivo (lectura nueva)':
      prev?.gs_origen_coordenadas==='GPS_DISPOSITIVO'?'GPS del dispositivo (registro guardado)':'Sin captura GPS verificable';
    const time=captured?recentGPS.obtainedAt:prev?.gs_gps_fecha_hora_utc||'';
    const acc=captured?recentGPS.accuracy:prev?.gs_gps_precision_m;
    const shown='Origen: '+src+' · Fecha/hora GPS (UTC): '+(time||'pendiente')+
      ' · Precisión: '+(numeric(acc)?acc+' m':'pendiente');
    if(note.textContent!==shown)note.textContent=shown;
  }
}
async function backupEverything(){
  if(exporting)return;
  const all=rows();if(!all.length){alert('No hay registros guardados para respaldar.');return}
  if(typeof JSZip==='undefined'){alert('No se cargó el generador ZIP. No borres registros.');return}
  exporting=true;
  try{
    const zip=new JSZip(),stamp=new Date().toISOString().replace(/[:.]/g,'-');
    zip.file('REGISTROS_COMPLETOS.json',JSON.stringify({app:'GS Documentos',version:'v137',
      respaldado_en_utc:now(),total:all.length,registros:all},null,2));
    const audit=all.map(r=>({orden_ro:r.orden_ro||'',id_registro:r.id_registro||'',
      fecha_registro:r.fecha_registro||'',inicio_captura_utc:r.gs_inicio_captura||'',
      guardado_utc:r.fecha_hora_creacion||'',ultima_actualizacion_utc:r.fecha_hora_actualizacion||'',
      origen:r.gs_origen_coordenadas||'SIN_TRAZABILIDAD_HISTORICA',
      gps_fecha_hora_utc:r.gs_gps_fecha_hora_utc||'',gps_precision_m:r.gs_gps_precision_m??'',
      latitud:r.latitud??'',longitud:r.longitud??'',historial_gps:r.gs_historial_gps||[]}));
    zip.file('AUDITORIA_GPS.json',JSON.stringify(audit,null,2));
    if(globalThis.XLSX?.utils){
      const headers=['Orden_RO','Fecha de registro','Nombres','Identificación','Contacto','Dirección',
        'localidad','Sector/Barrio','Latitud (Y)','Longitud (X)','Precisión (m)'];
      const excel=all.map(r=>({
        'Orden_RO':r.orden_ro||'','Fecha de registro':r.fecha_registro||'',
        'Nombres':r.nombres||'','Identificación':r.identificacion||'',
        'Contacto':r.contacto||'','Dirección':r.direccion||'',
        'localidad':r.localidad||'','Sector/Barrio':r.sector||'',
        'Latitud (Y)':r.latitud??'','Longitud (X)':r.longitud??'',
        'Precisión (m)':r.precision??''}));
      const ws=XLSX.utils.json_to_sheet(excel,{header:headers});
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Registros');
      zip.file('REGISTROS.xlsx',XLSX.write(wb,{bookType:'xlsx',type:'array'}));
    }
    const blob=await zip.generateAsync({type:'blob'}),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='GS_RESPALDO_COMPLETO_'+stamp+'.zip';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    alert('Se generó una COPIA de '+all.length+' registros. Verifica el ZIP en Descargas. No se eliminó ningún registro del celular.');
  }catch(e){console.error('GS v137 respaldo',e);alert('Error preparando respaldo. No se borró ningún registro: '+e.message)}
  finally{exporting=false}
}
document.addEventListener('click',e=>{
  const btn=e.target?.closest?.('button');if(!btn)return;
  if(btn.id==='closeJornada'||/cerrar\s+y\s+exportar\s+jornada/i.test(btn.textContent||'')){
    e.preventDefault();e.stopImmediatePropagation();backupEverything();return;
  }
  if(['saveRegister','saveNoConsentRecord'].includes(btn.id)&&!validFieldRecord()){
    e.preventDefault();e.stopImmediatePropagation();
    alert('Captura el GPS desde el predio antes de guardar. Fecha y coordenadas no pueden digitarse. El registro en curso se conserva.');
  }
},true);
for(const type of ['input','change']){
  document.addEventListener(type,e=>{
    if(['reg_fecha','reg_lat','reg_lon'].includes(e.target?.id)&&state().role==='tecnico'){
      e.preventDefault();e.stopImmediatePropagation();protectInputs();
    }
  },true);
}
const observer=new MutationObserver(()=>protectInputs());
const init=()=>{
  const host=document.getElementById('register');
  if(host)observer.observe(host,{childList:true,subtree:true,
    attributes:true,attributeFilter:['readonly','disabled','type','inputmode']});
  protectInputs();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
console.info('GS Documentos v137: auditoría GPS y copia no destructiva habilitadas');
})();