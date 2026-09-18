# No lo puedo creer.

## TODO'S [ ]

- [x] Implementar en la ruta `sync/recibos` la distinción de **"Facturas"** y **"Arriendo"**, ya que **Arriendo** no posee un `tipoFacturaId`. (Ya se maneja con el tipo de Factura ID .-.)
- [ ] Implementar la dependencia `Bonjour` que usa `mDNS` para poder exponer en el servicio **DNS** de el **Router Local la IP** de el servidor usando el nombre de host.
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
- [x] `authMiddleware.ts`: el error `498` devuelve el objeto de error completo de `jsonwebtoken`
      en el body — evaluar si conviene un mensaje genérico en vez de exponer el error interno.
      (Resuelto 2026-09-17: ahora responde un mensaje genérico y solo loguea `err` server-side.)
- [x] `authMiddleware.ts`: el middleware no valida el esquema del header `Authorization` (acepta
      `Basic`, `Bearer`, o cualquier palabra) — validar que sea `Bearer` explícitamente. (Resuelto
      2026-09-17.)
- [ ] `auth.ts`: quitar los `console.log` que imprimen el password en texto plano en registro y
      login.
- [ ] `auth.ts`: quitar el `console.log` que imprime `JWT_SECRET` al arrancar el módulo.
- [ ] `auth.ts`: validar que `direccion` exista en el body **antes** de llamar
      `direccion.toLowerCase()`, para devolver un `400` claro en vez de caer al `catch` genérico.
- [ ] `authMiddleware.ts` / `auth.ts` / `server.ts`: reemplazar el fallback hardcodeado de
      `JWT_SECRET` (`"putoDotEnv&PutoTS"`, repetido en los tres archivos) por un valor generado o
      por hacer que el servidor falle explícitamente si la env var no carga.
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