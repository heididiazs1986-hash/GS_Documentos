# GS Documentos · Editor PC (v1)

Rama de trabajo segura: `editor-pc-v1`. No modifica `main`.

## Objetivo
Abrir un ZIP generado por GS Documentos, corregir datos una sola vez y producir un nuevo ZIP corregido sin alterar el original.

## Lo comprobado con ZIP reales
Los paquetes actuales contienen E1, E6, AR, DJ, RETIE, EC, TD y una carpeta SOPORTES. Los PDF conservan campos de formulario editables, por lo que el editor puede corregir directamente los documentos existentes sin reconstruirlos desde cero. Las firmas están estampadas visualmente y los PDF conservan campos de firma; en v1 se preservan intactas.

## Dos modos de lectura
1. **ZIP legado:** reconstruye la ficha maestra a partir de campos de formulario de los PDF.
2. **ZIP nuevo:** si existe `GS_REGISTRO.json`, lo usa como ficha maestra. Todo ZIP exportado por el editor incorpora ese archivo para que las siguientes correcciones sean exactas y no dependan de inferencias.

## V1 implementada
- Abrir ZIP por selector o arrastrar y soltar.
- Detectar E1, E6, AR, DJ, RETIE, EC y TD.
- Conservar soportes sin cambios.
- Datos maestros: orden, usuario, identificación, contacto, localidad, sector, municipio, departamento, dirección, latitud, longitud, fecha, técnico, cédula técnica, profesión, consejo, matrícula, fecha de construcción y observaciones.
- Propagación de cambios maestros entre documentos relacionados.
- Editor de todos los campos de formulario de cada PDF.
- Coordenadas siempre editables.
- Generación de un ZIP nuevo con sufijo `_CORREGIDO`.
- Inclusión de `GS_REGISTRO.json` en la salida.

## Siguientes pasos
- Reemplazo controlado de firma del usuario y firma técnica.
- Vista previa del PDF antes de exportar.
- Etiquetas amigables adicionales para todos los campos técnicos.
- Incorporar `GS_REGISTRO.json` directamente en la generación normal de GS Documentos.
- Empaquetado/offline completo para uso de escritorio.
