/* Ejecutar: node tests/gsdoc-v137-audit.test.cjs */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../gsdoc-v137-audit.js'),'utf8');
class Storage{
  constructor(){this.data={}}
  setItem(k,v){this.data[k]=String(v)}
  getItem(k){return this.data[k]??null}
  removeItem(k){delete this.data[k]}
}
class MutationObserver{observe(){}}
const store=new Storage(),handlers={},messages=[];
let coords={latitude:4.5353838,longitude:-74.1645349,accuracy:11.24};
const geolocation={
  getCurrentPosition(success){success({coords,timestamp:Date.parse('2026-10-16T14:04:00Z')})}
};
const document={
  readyState:'loading',
  addEventListener(type,fn){handlers[type]=fn},
  getElementById(){return null},
  createElement(){return {click(){},remove(){}}},
  body:{appendChild(){}}
};
const win={};
const ctx={window:win,Storage,localStorage:store,navigator:{geolocation},document,
  MutationObserver,Date,Intl,Number,Math,JSON,console,setTimeout,
  alert:m=>messages.push(m),
  URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}}
};
ctx.globalThis=ctx;
const state={role:'tecnico',screen:'register',currentRecord:null,editingRecordId:null,
  registration:{orden_ro:'1580000001',latitud:'4.5353838',longitud:'-74.1645349'}};
store.setItem('GS_DOCS_V49',JSON.stringify(state));
vm.runInNewContext(source,ctx);
const save=arr=>store.setItem('GS_DOCS_REGISTROS_V1',JSON.stringify(arr));
const read=()=>JSON.parse(store.getItem('GS_DOCS_REGISTROS_V1'));
assert.throws(()=>save([{id_registro:'a',rol:'tecnico',orden_ro:'1580000001',
  latitud:'4.5353838',longitud:'-74.1645349'}]),/capturar el GPS/);
geolocation.getCurrentPosition(()=>{});
const first={id_registro:'a',rol:'tecnico',orden_ro:'1580000001',
  latitud:'4.5353838',longitud:'-74.1645349',
  fecha_hora_creacion:'2026-10-16T14:06:00Z'};
save([first]);
assert.equal(read()[0].gs_origen_coordenadas,'GPS_DISPOSITIVO');
assert.equal(read()[0].gs_gps_fecha_hora_utc,'2026-10-16T14:04:00.000Z');
assert.equal(read()[0].gs_gps_precision_m,11.24);
assert.equal(read()[0].fecha_hora_creacion,first.fecha_hora_creacion);
assert.equal(read()[0].gs_historial_gps.length,1);
// Otra orden no hereda la lectura anterior aunque comparta ubicación.
assert.throws(()=>save([read()[0],{...first,id_registro:'b',orden_ro:'1580000002'}]),/capturar el GPS/);
state.registration.orden_ro='1580000002';
store.setItem('GS_DOCS_V49',JSON.stringify(state));
geolocation.getCurrentPosition(()=>{});
save([read()[0],{...first,id_registro:'b',orden_ro:'1580000002'}]);
assert.equal(read().length,2);
assert.equal(read()[0].gs_historial_gps.length,1);
assert.equal(read()[1].gs_historial_gps.length,1);
assert.throws(()=>save([]),/limpieza automática/);
store.removeItem('GS_DOCS_REGISTROS_V1');
assert.equal(read().length,2);
// Una longitud positiva no puede provenir de una captura aceptada.
coords={latitude:4.5353838,longitude:74.1645349,accuracy:5};
let gpsError='';
geolocation.getCurrentPosition(()=>{throw new Error('no debería aceptar GPS positivo')},e=>{gpsError=e.message});
assert.match(gpsError,/fuera de Colombia/);
console.log('OK: GPS, fecha, precisión, orden, histórico y prevención de borrado');
