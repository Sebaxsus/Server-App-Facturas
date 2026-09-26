# No lo puedo creer.

## TODO'S [ ]

- [x] Implementar en la ruta `sync/recibos` la distinción de **"Facturas"** y **"Arriendo"**, ya que **Arriendo** no posee un `tipoFacturaId`. (Ya se maneja con el tipo de Factura ID .-.)
- [ ] Implementar la dependencia `Bonjour` que usa `mDNS` para poder exponer en el servicio **DNS** de el **Router Local la IP** de el servidor usando el nombre de host.
  - Esbozo agregado 2026-09-17, sin implementar — solo para no perder el diseño antes de arrancar:
    no bloquea las pruebas del 2026-09-18, ya que el cliente hoy apunta a `"localhost"` hardcodeado
    (`ConexionServer("localhost", null, "3000")`).
    - **Servidor**: instalar `bonjour-service` (mantenido; el paquete `bonjour` original está sin
      mantenimiento) y anunciar el servicio en `src/server.ts` al arrancar, después de que
      `app.listen()` confirme el `PORT` real en uso — algo como
      `new Bonjour().publish({ name: 'app-facturas', type: 'http', port: PORT, host: <nombre-de-host> })`.
      Reutilizar `getLocalIPAddress()` (`src/utils/utils.ts`) solo para logging/diagnóstico, no
      para el anuncio en sí (`bonjour-service` ya resuelve la IP real de la interfaz).
    - **Cliente**: ya tiene la dependencia `bonjour` instalada pero sin conectar (ver
      `Mi_Primer_Electron/Doc/CONTRATO_SERVIDOR.md`, sección Conexión). Cambiar
      `ConexionServer` para que, si no hay una IP guardada localmente (primera conexión o
      cambio de red), resuelva el host vía `bonjour.find({ type: 'http' })` antes de caer al
      fallback `"localhost"`; cachear la IP resuelta para no depender de mDNS en cada arranque.
    - **Nombre de host a anunciar**: decidir si se usa un nombre fijo (`app-facturas.local`) o
      configurable por env — pendiente de decisión, no asumir todavía.
    - **Riesgo a validar**: mDNS no cruza subredes/VLANs y algunos routers domésticos lo filtran
      por defecto — probar en la red real antes de depender de esto como único mecanismo de
      descubrimiento; mantener `"localhost"`/IP fija como fallback manual.
- [ ] Implementar Mock's con Mongo en Memoria usando la lib `mongodb-memory-server`.
- [ ] Implementar testing usando `Jest`.

## TODO's Scheme >

- [ ] Añadir el campo cuenta contrato para facturas y manejarlo en todos los archivos a los que afecte.

## TODO's Auth

- [ ] Hacer un método `update` para actualizar o cambiar la contraseña, dirección o usuario; Esto con el fin de utilizar el campo Timestamp.

## Hallazgos de la revisión del 2026-09-04

> Detalle completo de cada uno en `Doc/ESTADO_ACTUAL.md`, sección 5. Checklist accionable, sin
> tocar los ítems previos de este archivo.

- [ ] `server.ts`: `MONGO_URI` se lee de `.env` pero nunca se usa — la conexión a Mongo está
      hardcodeada a `mongodb://localhost/appCuentas`.
- [ ] `server.ts`: eliminar o montar `src/routes/ping.ts` (`pingRouter`) — hoy es código muerto,
      nunca se importa; `server.ts` usa su propia ruta `/ping` inline con otra forma de respuesta.
- [ ] `authMiddleware.ts`: quitar el `console.log` que imprime el JWT crudo recibido (reactivado
      en el working tree actual) — riesgo de exponer credenciales en logs.
      (Nota 2026-09-25: migrado a `logger.debug()` — ya no aparece en consola en arranque normal,
      pero sigue quedando en texto plano en `logs/app.log`. El pendiente de eliminarlo sigue
      abierto.)
- [x] `authMiddleware.ts`: el error `498` devuelve el objeto de error completo de `jsonwebtoken`
      en el body — evaluar si conviene un mensaje genérico en vez de exponer el error interno.
      (Resuelto 2026-09-17: ahora responde un mensaje genérico y solo loguea `err` server-side.)
- [x] `authMiddleware.ts`: el middleware no valida el esquema del header `Authorization` (acepta
      `Basic`, `Bearer`, o cualquier palabra) — validar que sea `Bearer` explícitamente. (Resuelto
      2026-09-17.)
- [ ] `auth.ts`: quitar los `console.log` que imprimen el password en texto plano en registro y
      login.
      (Nota 2026-09-25: migrados a `logger.debug()` — ya no aparecen en consola en arranque
      normal, pero siguen en texto plano en `logs/app.log`. El pendiente de eliminarlos del todo
      sigue abierto.)
- [ ] `auth.ts`: quitar el `console.log` que imprime `JWT_SECRET` al arrancar el módulo.
      (Nota 2026-09-25: mismo caso, migrado a `logger.debug()`, sigue en texto plano en el
      archivo de log.)
- [ ] `auth.ts`: validar que `direccion` exista en el body **antes** de llamar
      `direccion.toLowerCase()`, para devolver un `400` claro en vez de caer al `catch` genérico.
- [ ] `authMiddleware.ts` / `auth.ts` / `server.ts`: reemplazar el fallback hardcodeado de
      `JWT_SECRET` (`"putoDotEnv&PutoTS"`, repetido en los tres archivos) por un valor generado o
      por hacer que el servidor falle explícitamente si la env var no carga.
      (Causa raíz encontrada 2026-09-25: en ESM real (`tsc` + `node`, lo que usa `npm start`),
      los módulos importados estáticamente — `auth.ts`, `authMiddleware.ts` — se ejecutan
      **antes** que el cuerpo de `server.ts`, así que su `const JWT_SECRET = process.env...`
      corre antes de que `dotenv.config()` llegue a ejecutarse, y siempre cae al fallback
      hardcodeado. Confirmado con el propio `.env` del proyecto: define un valor distinto al
      hardcodeado y aun así nunca se usa. Fix recomendado: mover `dotenv.config()` a un archivo
      bootstrap separado que haga `await import('./app.js')` — el `import()` dinámico no se
      hoistea como los `import` estáticos, así que garantiza el orden correcto. Esto también
      explica por qué `ts-node-dev --esm` nunca fue realmente ESM: `--esm` no es una opción real
      de `ts-node-dev` (no aparece en sus flags reconocidos, `node_modules/ts-node-dev/lib/bin.js`)
      — siempre corrió vía su hook CJS (`require()` transpilado), donde el orden textual sí se
      respeta, por eso el bug no se notaba en `npm run dev` hasta que Node 24 empezó a rechazar
      ese `require()` sobre un archivo que resuelve como ESM por el `"type": "module"` del
      `package.json`.)
- [ ] `documentValidation.ts`: unificar las dos queries separadas a `User.findById` por request
      en una sola.
- [x] `sync.ts`: corregir el typo "Arreindo" en el mensaje de éxito de `/sync/Recibos` (debería
      variar según `tipo`, no estar copiado del handler de `/Arriendo`). (Resuelto 2026-09-17: el
      mensaje ahora es `` `Sincronización de Recibos (${tipo}) completada` ``.)
- [ ] `sync.ts`: migrar la validación de body de `/sync/Facturas` y `/sync/Recibos` a un
      middleware dedicado (TODO ya existente en el código, sin resolver).
- [x] `sync.ts`: implementar el retorno de `savedReciboIds` al cliente en `/sync/Recibos` (TODO
      ya existente en el código, variable dejada comentada). (Resuelto 2026-09-17: la respuesta
      ahora incluye `ids: recibos.map(r => r._id)`.)
- [ ] `sync.ts`: `/sync/Recibos` asume que todo el batch de recibos pertenece a la misma factura
      tomando solo `recibos[0]?.tipoFacturaId` — validar explícitamente que todos coincidan, o
      rechazar el batch si no.
- [ ] `sync.ts`: decidir y unificar quién genera `tipoFactura[].lastSyncedTimestamp` en
      `/sync/Recibos` (hoy a veces lo pone el cliente, rompiendo la regla de "servidor siempre
      genera lastSyncedTimestamp de House" que se sigue en el resto de rutas).
- [ ] `sync.ts`: confirmar si la respuesta de `/sync/Arriendo` debe ser `200`/`syncedCount: null`
      o `201`/`syncedCount: 1` (cambiado en el working tree sin commitear) y dejarlo consistente.
- [ ] `Test/API.http`: corregir el ejemplo de `/sync/last-sync` que usa `Authorization: Basic`
      en vez de `Bearer`.
- [ ] `Test/API.http`: agregar el campo `valor` (requerido por el schema) al payload de prueba
      de `/sync/Arriendo`.
- [ ] `Test/API.http`: quitar los tokens JWT reales embebidos como ejemplo y reemplazarlos por
      placeholders.
- [ ] Añadir el campo `REFERENCIA` a `TipoFacturaSchema`/`TipoFactura` — pendiente también del
      lado cliente, ver `Doc/CONTRATO_SERVIDOR.md`.
- [ ] Limpiar bloques de código muerto comentado (diseños abandonados) en
      `documentValidation.ts`, `authInterface.ts`, `interfaces.ts`, `House.ts`, `User.ts` y el
      endpoint genérico `POST /sync` comentado en `sync.ts` — conservar solo si se quiere el
      historial visual de intentos, o mover a un commit de referencia y limpiar el archivo activo.

## Hallazgos de la revisión del 2026-09-17

> Detectados al reconciliar contra `Mi_Primer_Electron/Doc/CONTRATO_SERVIDOR.md` (actualizado ese
> mismo día), que ya asume features del lado cliente que el servidor no tenía. Implementados en la
> misma sesión — detalle en `Doc/CONTRATO_SERVIDOR.md` y `Doc/ESTADO_ACTUAL.md`.

- [x] Implementar `POST /auth/refresh` y devolver `refreshToken` en `/auth/register` y
      `/auth/login` (JWT stateless, `type: 'refresh'`, expira en `7d`, mismo `JWT_SECRET`). Se
      agregó también el chequeo en `authToken` que rechaza un `refreshToken` usado como token de
      acceso en `/sync/*`.
- [x] Agregar campo `type: 'personal' | 'casa'` al body de `POST /sync/Ahorros` para poder
      sincronizar `User.ahorros` (personales) además de `House.ahorros` (compartidos). Default
      `'casa'` si el cliente no manda el campo.

## Hallazgos de la revisión del 2026-09-25

> Disparado por la primera prueba manual de integración cliente-servidor: la consola quedaba
> inundada de trazas de debug (JWT completo incluido) y no había ninguna persistencia de logs.
> Detalle completo en `Doc/ESTADO_ACTUAL.md`.

- [x] Implementar un logger personalizado en `src/utils/logger.ts` (singleton, no se pueden crear
      dos instancias) con niveles `TRACE, DEBUG, INFO, WARN, ERROR, CRITICAL`, color ANSI por
      nivel en consola, timestamp con fecha y hora, formato
      `[LEVEL] dd/MM/YYYY-HH:mm Title - Message`, y reemplazar todos los `console.log`/
      `console.error` activos del código fuente (30 llamadas, en `server.ts`, `utils.ts`,
      `auth.ts`, `sync.ts`, `authMiddleware.ts`, `documentValidation.ts`, `cors.ts`).
- [x] Persistencia a disco en `logs/app.log` corriendo en un `worker_thread` dedicado
      (`src/utils/loggerWorker.mjs`) para que el hilo principal del servidor nunca se bloquee por
      I/O de logs — el hilo principal hace `postMessage` (no bloquea) y el worker escribe
      `appendFileSync` en su propio hilo, en el orden exacto en que llegan los mensajes.
- [x] Rotación de logs al arrancar el servidor: si ya existe `logs/app.log`, se renombra a
      `logs/app.log.old` (sobrescribiendo el anterior) y arranca un `app.log` nuevo.
- [x] Ciclo de vida del proceso: se agregaron manejadores de `SIGINT`/`SIGTERM` en `server.ts`
      (no existían) que esperan a que el worker del logger termine de escribir lo pendiente
      (`logger.shutdown()`) antes de cerrar Mongo y salir del proceso.
- [x] Modo `--log` (scripts `npm run dev:log` / `npm run start:log`): en arranque normal solo se
      ven en consola los niveles `WARN`/`ERROR`/`CRITICAL` (red de seguridad); con `--log` se ven
      también `TRACE`/`DEBUG`/`INFO`. En ambos casos todo se escribe siempre al archivo.

## Hallazgos de la revisión del 2026-09-25 (2)

> Separación de responsabilidades BD-Archivos: `comprobante` viajaba embebido en el JSON de
> `/sync/Recibos` sin ninguna validación real (en la práctica el cliente ni siquiera manda
> base64, manda una ruta local — `saveComprobante()` del lado cliente nunca se terminó de
> implementar). Detalle completo en `Doc/ESTADO_ACTUAL.md` y `Doc/CONTRATO_SERVIDOR.md`.

- [x] Separar el almacenamiento de archivos de Mongo: dos servidores Express dentro del mismo
      proceso — `src/fileServer/fileServer.ts` (interno, `127.0.0.1:FILE_SERVER_PORT`, solo
      guarda/lee bytes en `uploads/` vía `multer`, por fin usado) y el gateway público
      `src/routes/files.ts` montado en `/cdn`, que hace de **reverse proxy** real
      (`http-proxy-middleware`, nueva dependencia) hacia el servicio interno, autenticado con
      `authToken`/`validateDoc` igual que `/sync/*`.
- [x] Nueva colección Mongo `File` (`src/schemas/Mongo/File.ts`) para la metadata (`houseId`,
      `ownerUserId`, `mimetype`, `originalName`, `size`) — genérica, no atada a "recibo",
      pensada para reusarse también en foto de perfil u otros adjuntos a futuro.
- [x] Rename `Recibo.comprobante` → `comprobanteId` (`src/schemas/Mongo/SubSchema.ts`,
      `src/interfaces/interfaces.ts`) — ahora es el `id` que devuelve `POST /cdn`, no un
      base64/ruta local. `src/routes/sync.ts` no necesitó cambios, ya trataba ese campo como
      opaco dentro de `syncCollection()`.
- [ ] **Pendiente en el cliente (`Mi_Primer_Electron`, no se toca desde este repo)**: hoy manda
      una ruta local absoluta en `comprobante`/`comprobanteId` porque `saveComprobante()`
      (`Modules/UI-utils.js`) nunca implementó la subida real. Falta: leer los bytes del archivo
      (hoy `window.fsUtils.selectFile()` solo devuelve la ruta, no el contenido), armar un
      `multipart/form-data` contra `POST /cdn` con el `Authorization: Bearer` ya existente, y usar
      el `id` de la respuesta como `comprobanteId` al sincronizar.