# Instrucciones del proyecto — Server-App-Facturas

Backend (Node/TypeScript + Express + MongoDB) del sistema de facturas. Este proyecto está
pausado/abandonado por temporadas largas — los documentos de `Doc/` son la referencia de a dónde
quedó, no el código en sí, ya que el autor deja comentarios extensos y bloques de código
comentado como historial visual de sus propios intentos (no siempre limpiar eso es un error).

## Alcance de revisiones y documentación

Quedan **fuera de alcance** para cualquier revisión, exploración o generación de documentación:
`node_modules/`, `dist/`.

## Mantenimiento de los documentos de `Doc/`

Este proyecto sigue el mismo esquema de documentación que su cliente de escritorio
(`Mi_Primer_Electron`, repo separado):

- **`Doc/CONTRATO_SERVIDOR.md`**: contrato técnico real del servidor (endpoints, payloads,
  respuestas, esquemas Mongoose, flujo de autenticación y sincronización). Actualizar cuando
  cambie cualquier ruta, esquema, o el comportamiento de auth/sync — es la referencia que usa el
  desarrollo del cliente.
- **`Doc/ESTADO_ACTUAL.md`**: panorama narrativo de arquitectura, inventario de endpoints,
  hecho/pendiente a nivel de feature, decisiones de diseño sin resolver, y bugs/código muerto
  conocidos. Actualizar cuando se resuelvan o introduzcan bugs, features, o código muerto
  significativo.
- **`Doc/TODO.md`**: checklist accionable. Mantiene tanto los TODOs originales del autor como
  secciones fechadas de "Hallazgos de la revisión del [fecha]" agregadas en revisiones
  posteriores — nunca reescribir ni borrar ítems previos sin que el autor lo pida
  explícitamente, solo agregar.

Cuando se haga una revisión de código nueva (propia o asistida por IA), seguir el mismo patrón:
releer el código fuente real (no confiar en la versión anterior de estos documentos), actualizar
`ESTADO_ACTUAL.md` y `CONTRATO_SERVIDOR.md` si cambiaron, y agregar una nueva sección fechada de
hallazgos en `TODO.md` en vez de sobrescribir la anterior.

## Referencia cruzada con el cliente

Este backend es la fuente de verdad ("Server as Source of Truth") para el cliente Electron en
`Mi_Primer_Electron` (repo separado, ruta típica:
`E:\ProgramasYo\Universidad\Proyectos_aleatorios\Mi_Primer_Electron`). Ese proyecto tiene su
propio `Doc/CONTRATO_SERVIDOR.md` que describe lo que el **cliente asume** del servidor, y su
propio `Doc/ESTADO_ACTUAL.md`. Ninguno de los dos se actualiza automáticamente al cambiar el
otro — si se modifica algo del contrato en este backend (rutas, payloads, esquemas), hay que
revisar manualmente si el documento del cliente queda desactualizado y avisar/actualizarlo en
esa sesión de trabajo aparte.
