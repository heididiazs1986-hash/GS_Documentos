# Mapa de campos confirmado con ZIP reales

Validado con dos paquetes reales de GS Documentos:
- Vianey Andrade Bolívar
- Rafael Ricardo Gutiérrez Clavijo

## Estructura observada
Cada paquete contiene:
- TD
- E1
- E6
- AR
- DJ
- RETIE
- EC
- carpeta SOPORTES

Los PDF conservan campos AcroForm editables. Conteo observado:
- E1: 53 campos
- E6: 21 campos
- AR: 11 campos
- DJ: 13 campos
- RETIE: 17 campos
- EC: 11 campos
- TD: 28 campos

## Campos maestros principales

| Dato maestro | Campos vinculados |
|---|---|
| Nombre | E1: `1 Nombre o Razón Social`; E6: `text_27bpxy`; AR: `text_6prgm`; DJ: `Nombre solicitante`, `Solicitante Firma`; RETIE: `retie_solicitante`; EC: `ec_usuario`; TD: `usuario`, `text_232y0c`, `text_275h9f` |
| Identificación | E1: `4 Número de Documento`; AR: `text_7jdiv`; DJ: `NumIdentificacion`; RETIE: `retie_identificacion`; EC: `ec_identificacion`; TD: `cedula`, `text_245p3i`, `text_289o8f` |
| Contacto | E1: `8 Celular`; E6: `text_329o6m`; TD: `contacto` |
| Orden RO | E1: `No de solicitud`; TD: `orden_ro` |
| Localidad | E1: `3 Localidad`; AR: `text_2tgsw`, `text_5yied`; TD: `localidad` |
| Sector | AR: `text_1lojj`; TD: `sector` |
| Dirección | E1: `5 Dirección de quien radica`, `6 Dirección del predio`; E6: `text_2gqcv`; AR: `text_4mqvb`; DJ: `Direccion`; RETIE: `retie_direccion`; EC: `ec_direccion`; TD: `direccion` |
| Latitud | E1: `Coordenada Y` |
| Longitud | E1: `Coordenada X` |
| Técnico | E6: `text_30sznp`; RETIE: `retie_constructor`; EC: `ec_tecnico`, `ec_tecnico_1`; TD: `text_291t9n` |
| Cédula técnico | RETIE: `retie_const_identificacion`; EC: `ec_identificacion_tecnico`; TD: `text_301t3m` |
| Matrícula | RETIE: `retie_matricula_const`; EC: `ec_matricula`, `ec_matricula_1` |
| Profesión | RETIE: `retie_prof_constructor` |
| Consejo | RETIE: `retie_consejo` |
| Fecha construcción | RETIE: `retie_fecha_construccion` |
| Observaciones | TD: `observaciones` |

## Firmas
Los PDF conservan campos de firma aunque la firma visual ya esté estampada:
- E1: `signature_480n0a`
- E6: `signature_337f0v`
- AR: `signature_126y9t`
- DJ: `signature_131z3s`
- RETIE: `signature_206h5k`
- EC: `signature_89l9m`
- TD: `Firma usuario` y `Firma tecnico`

Esto permite conservar las firmas existentes y deja una ruta técnica clara para implementar reemplazo controlado de firma posteriormente.

## Regla nueva
Todo ZIP corregido por el editor incluye `GS_REGISTRO.json`. Así, después de la primera corrección, futuras aperturas no necesitarán reconstruir la ficha maestra a partir de los PDF.
