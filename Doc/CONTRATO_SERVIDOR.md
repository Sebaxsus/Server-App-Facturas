# Contrato del Servidor (fuente autoritativa)

> **Estado: fotografía verificada contra el código fuente real.**
> Este documento describe el comportamiento **real** de este backend tal como está implementado
> hoy, reconstruido leyendo `src/server.ts`, `src/routes/*.ts`, `src/middleware/*.ts`,
> `src/schemas/Mongo/*.ts` y `src/interfaces/*.ts` — no a partir de `README.md` ni de
> `Doc/TODO.md`, que pueden estar desactualizados.
>
> **Última actualización:** 2026-09-17 — se implementó refresh token (`POST /auth/refresh`),
> sincronización de ahorros personales (`type` en `POST /sync/Ahorros`), y confirmación de
> recibos sincronizados por id (`ids` en la respuesta de `POST /sync/Recibos`), tras reconciliar
> contra `Mi_Primer_Electron/Doc/CONTRATO_SERVIDOR.md`. Fotografía original: 2026-09-04.
>
> Es la contraparte autoritativa de
> `Mi_Primer_Electron/Doc/CONTRATO_SERVIDOR.md` (el contrato que el **cliente** asume). Ese
> documento no se modifica desde aquí; la sección [Reconciliación](#reconciliación-con-las-preguntas-abiertas-del-cliente)
> responde sus 5 preguntas abiertas solo en este archivo. Si cambia algo de lo descrito aquí,
> hay que reconciliarlo manualmente con ese documento.

## Cómo usar este archivo

Antes de implementar o modificar cualquier funcionalidad del cliente que dependa de este
servidor (autenticación, sincronización, esquema de datos), leer este archivo para saber qué
expone y qué espera el servidor **hoy**. Si se modifica el servidor, actualizar primero este
documento y luego evaluar si el cambio rompe algo del lado del cliente.

## Conexión

- El servidor escucha en `HOST = "0.0.0.0"` (todas las interfaces de red locales), puerto
  `PORT` (variable de entorno, default `3000` si no está definida) — `src/server.ts`.
- No hay URL de producción ni descubrimiento por nombre de host: la constante `MONGO_URI` se
  lee de env pero **no se usa** (ver [Estado Actual](./ESTADO_ACTUAL.md)); la conexión a Mongo
  está hardcodeada. El soporte mDNS/Bonjour para exponer el servidor por nombre en la red local
  (`getLocalIPAddress()` en `src/utils/utils.ts`) existe pero no está conectado a nada — sigue
  pendiente en `Doc/TODO.md`.
- CORS (`src/middleware/cors.ts`): solo acepta los orígenes `http://localhost:5173` y
  `http://localhost/`, hardcodeados (no configurables por env). Permite requests sin header
  `origin` (same-origin/llamadas locales tipo curl o el propio cliente Electron vía `axios`
  desde el proceso principal, que no manda `origin`).

## Autenticación

Todas las rutas viven bajo `/auth` (`src/routes/auth.ts`).

| Endpoint | Método | Body esperado | Respuesta éxito | Respuesta error |
| --- | --- | --- | --- | --- |
| `/auth/register` | POST | `{ username, password, direccion }` (password en **texto plano**) | `201` `{ message, token, refreshToken, lastSyncedTimestamp }` | `400` si falta algún campo; `409` si `username` ya existe; `500` genérico en cualquier otro fallo |
| `/auth/login` | POST | `{ username, password }` (password en **texto plano**) | `200` `{ token, refreshToken, lastSyncedTimestamp: user.lastSyncedTimestamp }` | `401` "Credenciales invalidas" (mensaje genérico, no distingue usuario inexistente de password incorrecta) |
| `/auth/refresh` | POST | `{ refreshToken }` | `200` `{ token, refreshToken }` (rota ambos) | `400` si falta `refreshToken`; `401` si es inválido/expirado o si no es un token de tipo `refresh` |

Detalles relevantes para el cliente:

- `direccion` se normaliza a minúsculas server-side antes de buscar/crear la `House` asociada.
  Si ya existe una `House` con esa `direccion`, el nuevo usuario se vincula a ella (mecanismo de
  "hogar compartido" entre varios usuarios); si no existe, se crea una `House` nueva.
- El password se hashea server-side con `bcrypt` (`SALT = 10`) — el cliente **nunca** debe
  mandar un hash propio, siempre el password en claro (confirma la duda de diseño documentada
  en el lado cliente sobre pre-hashing).
- El JWT de acceso generado en register y login tiene payload `{ userId }`, firmado con
  `JWT_SECRET` (env) y `expiresIn: '1h'`. Ambos endpoints devuelven además `refreshToken`
  (payload `{ userId, type: 'refresh' }`, mismo `JWT_SECRET`, `expiresIn: '7d'`) — **implementado
  2026-09-17**. **Sigue sin existir** logout ni invalidación real (el refresh token es
  stateless, no se guarda en BD, así que no se puede revocar antes de su expiración), ni roles.
- `POST /auth/refresh` verifica el `refreshToken`, exige que su payload tenga `type === 'refresh'`
  (si se le manda un token de acceso normal, lo rechaza con `401`), y devuelve un `token` de
  acceso nuevo junto con un `refreshToken` nuevo (rotación simple, sin lista de revocación).
- No hay rate limiting ni protección contra fuerza bruta en ninguno de los tres endpoints.
- `/auth/authenticate` **no existe** en el servidor (ver reconciliación, pregunta 2).

### Middleware de autenticación (`src/middleware/authMiddleware.ts`)

Aplica a todas las rutas de `/sync/*` (no a `/auth/*`, que no lo requiere, ni a `/ping`).

- Header esperado: `Authorization: Bearer <token>`. **Implementado 2026-09-17**: el middleware
  ahora valida explícitamente que el esquema sea `Bearer` — cualquier otro esquema (`Basic`, o
  ausente) responde `401`.
- Si falta el header → `400` `{ message: "Asegurese de estar enviando el encabezado de
  Autorizacion" }`.
- Si el esquema no es `Bearer` → `401` `{ message: "Esquema de autorizacion invalido, se esperaba
  'Bearer'" }` (**nuevo 2026-09-17**).
- Si falta el token tras el split → `401` `{ message: "Asegurese que se esta enviando el token"
  }`.
- Si `jwt.verify` falla (expirado o inválido) → `498` `{ message: "Token invalido o expirado" }`
  — **cambiado 2026-09-17**: antes exponía el objeto de error interno de `jsonwebtoken` en el
  body; ahora solo se loguea server-side (`console.error`) y el cliente recibe un mensaje
  genérico.
- Si el token decodifica con `type === 'refresh'` → `401` (**nuevo 2026-09-17**: evita que un
  `refreshToken` se use para autenticar contra `/sync/*`, ya que comparte `JWT_SECRET` y también
  trae `userId` en el payload).
- Si es válido, inyecta `req.user = { userId }` y continúa.

### Middleware de resolución de casa (`src/middleware/documentValidation.ts`)

Se ejecuta después de `authToken` en todas las rutas de `/sync/*`. Busca el `houseId` del
usuario autenticado y lo inyecta en `req.user`, dejando `req.user = { userId, houseId }` para
los handlers.

- Si no hay `userId` en `req.user` (no debería pasar tras `authToken`) → `401`.
- Si el usuario no tiene `houseId` asignado → `404` "No cuenta con una casa registrada a su
  usuario, Porfavor registre una!.".
- Si el usuario o la casa referenciada no existen en base de datos → `404` con mensaje
  específico por entidad.

## Esquemas de datos (MongoDB / Mongoose)

Dos colecciones principales, relacionadas por referencia (`houseId`), no por embedding entre
ellas. Cada `House` embebe sus propias sub-colecciones de datos financieros.

### `House` (`src/schemas/Mongo/House.ts`)

| Campo | Tipo | Notas |
| --- | --- | --- |
| `direccion` | `String` | `required`, `unique`, indexado. Se usa como clave de negocio para vincular usuarios a un mismo hogar. |
| `ahorros` | `[MovimientoAhorroSchema]` | Array embebido. |
| `tipoFactura` | `[TipoFacturaSchema]` | Array embebido. |
| `arriendo` | `ArriendoSchema` | Objeto único embebido (no array). |
| `recibosFacturas` | `[RecibosSchema]` | Array embebido. |
| `recibosArriendo` | `[RecibosSchema]` | Array embebido — misma sub-schema que `recibosFacturas`, colección separada. |
| `lastSyncedTimestamp` | `Date \| null` | Setter que parsea string ISO → `Date`; default `null`. Siempre lo escribe el **servidor** (fecha actual) en cada sync exitoso, nunca el cliente. |

### `User` (`src/schemas/Mongo/User.ts`)

| Campo | Tipo | Notas |
| --- | --- | --- |
| `username` | `String` | `required`, `unique`. |
| `passwordHash` | `String` | `required`. Hash bcrypt, nunca el password en claro. |
| `houseId` | `ObjectId` (ref `House`) | `required`, indexado. |
| `ahorros` | `[MovimientoAhorroSchema]` | Array embebido, **personal del usuario** (distinto del `ahorros` de `House`). |
| `lastSyncedTimestamp` | `Date \| null` | Mismo setter que en `House`. A diferencia de `House`, este campo lo escribe con el timestamp que **envía el cliente** (o `null` si no lo manda) — no lo genera el servidor. |

Método de instancia: `user.comparePassword(password)` → `bcrypt.compare(password,
this.passwordHash)`.

### Sub-schemas (`src/schemas/Mongo/SubSchema.ts`)

| Sub-schema | `_id` | Campos | Quién genera `_id` |
| --- | --- | --- | --- |
| `MovimientoAhorroSchema` | `String`, `required`, `_id: false` | `movimiento`, `fecha`, `usuario` (todos `String` `required`), `monto` (`Number` `required`), `timestamp` (`String` `required`, indexado) | **Cliente** (UUID generado localmente) |
| `RecibosSchema` | `String`, `required`, `_id: false` | `tipoFacturaId`, `fechaDePago`, `comprobante`, `timestamp` (todos `String` `required`), `estado` (`String`, default `'Pendiente'`) | **Cliente** (UUID) |
| `TipoFacturaSchema` | ObjectId autogenerado, `_id: true` | `tipo`, `empresa`, `paginaDePago`, `fechaDeLlegada` (todos `String` `required`), `bimestral` (`Boolean` `required`), `lastSyncedTimestamp` (`Date`, setter ISO→Date, default `null`) | **Servidor** (Mongo `ObjectId`) |
| `ArriendoSchema` | ObjectId autogenerado, `_id: true` | `fechaDePago`, `direccion`, `arrendatario` (todos `String` `required`), `valor` (`Number` `required`), `lastSyncedTimestamp` (`Date`, mismo setter) | **Servidor** (Mongo `ObjectId`) |

Ninguno de los schemas usa la opción `timestamps: true` de Mongoose — todos los campos de fecha
son manejados manualmente por la aplicación.

**No existe** ningún campo `REFERENCIA` en `TipoFacturaSchema` (ver reconciliación, pregunta 4).
`Recibo` no distingue semánticamente `fechaDePago` de `timestamp` más allá de guardarlos como
`String` — el servidor no valida ni interpreta su significado (ver reconciliación, pregunta 5).

## Flujo de sincronización (`src/routes/sync.ts`)

Router montado en `/sync`. **Todas** las rutas usan la cadena de middleware
`authToken → validateDoc`, por lo que requieren `Authorization` válido y un usuario con
`houseId` resuelto.

Modelo general: sincronización **pull + push por colección separada** — no existe un único
endpoint que sincronice todo junto (hubo un intento, ver `Doc/ESTADO_ACTUAL.md`, descartado a
favor de rutas específicas por tipo de dato).

### `GET /sync/last-sync`

- No requiere body.
- Devuelve `200 { lastSyncedTimestamp }` — es el `lastSyncedTimestamp` de la **casa** (`House`),
  como valor plano (`Date` o `null`), **no** como `{ house, user }`.
- `404` si la casa no existe.
- Es la ruta que el cliente debería consultar antes de decidir si hace un PULL completo
  (el servidor es la fuente de verdad, según el modelo documentado en `README.md`).

### `POST /sync/Ahorros`

- Body: `{ ahorros: MovimientoAhorro[], type?: 'personal' | 'casa', lastSyncedTimestamp? }`.
- **Nuevo 2026-09-17**: el campo `type` decide contra qué colección se sincroniza. `type:
  'casa'` (o si no se manda, es el default — compatible con clientes que aún no envían el campo)
  aplica `syncCollection` sobre `House.ahorros`. `type: 'personal'` aplica `syncCollection` sobre
  `User.ahorros` en su lugar (colección que existía en el esquema pero que ningún endpoint tocaba
  hasta ahora).
- Valida `ahorros` (400 si falta/no es array), `userId` (401), `houseId` (404), existencia de
  `User`/`House` en BD (404).
- Aplica `syncCollection(coleccionDestino, ahorros, syncedCount, "_id")`, donde
  `coleccionDestino` es `house.ahorros` o `user.ahorros` según `type` (ver más abajo la lógica de
  `syncCollection`).
- `house.lastSyncedTimestamp = new Date()` (siempre fecha del **servidor**, en ambos casos de
  `type` — sigue siendo el gate que consulta `GET /sync/last-sync`, independiente de qué
  colección específica cambió).
- `user.lastSyncedTimestamp = lastSyncedTimestamp ? new Date(lastSyncedTimestamp) : null`
  (siempre lo que mande el **cliente**, o `null`).
- Respuesta `200 { message, syncedCount, lastSyncedTimestamp: { user, house } }` — aquí sí viene
  como objeto `{ user, house }`.

### `POST /sync/Facturas`

- Body: `{ tipoFactura: TipoFactura[], lastSyncedTimestamp? }`.
- Misma validación que `Ahorros`.
- Aplica `syncCollection(house.tipoFactura, tipoFactura, syncedCount, "tipo")` — la propiedad
  única de comparación es `"tipo"`, no `"_id"` (porque el cliente no puede generar el `_id`, lo
  genera Mongo).
- Respuesta `200` incluye `ids: [[tipo, _id], ...]` — el mapeo `tipo → ObjectId` que el cliente
  necesita para poder referenciar la factura en `/sync/Recibos` después.
- Mismo patrón de timestamps que `Ahorros`.

### `POST /sync/Recibos`

- Body: `{ recibos: Recibo[], tipo: "Arriendo" | "Facturas", lastSyncedTimestamp? }`.
- El parámetro `tipo` selecciona dinámicamente la colección destino: `house.recibosArriendo` o
  `house.recibosFacturas` (acceso vía `house[\`recibos${tipo}\`]`).
- Si `tipo !== "Arriendo"`: busca la `Factura` relacionada usando **solo el primer elemento del
  batch** (`recibos[0]?.tipoFacturaId`) — asume que todos los recibos del array pertenecen a la
  misma factura, sin validarlo explícitamente. Si no la encuentra → `400` "No se encontro ese
  tipo de Factura en la Base de Datos!.".
- Aplica `syncCollection(house[\`recibos${tipo}\`], recibos, syncedCount, "_id")`.
- Actualiza `house.tipoFactura[i].lastSyncedTimestamp` con la fecha del **cliente** si viene, o
  la del servidor si no — a diferencia del resto de campos `lastSyncedTimestamp` de `House`, que
  siempre usan la fecha del servidor (inconsistencia documentada por el propio autor en un
  comentario del código, ver `Doc/ESTADO_ACTUAL.md`).
- Respuesta `200 { message, syncedCount, ids, lastSyncedTimestamp: { user, house } }`.
  - **Cambiado 2026-09-17**: `message` ahora es `` `Sincronización de Recibos (${tipo})
    completada` `` (antes decía literalmente "Sincronización de Información de Arreindo
    completada", copiado del handler de `/Arriendo`, incluso cuando `tipo === "Facturas"`).
  - **Nuevo 2026-09-17**: `ids` es `recibos.map(r => r._id)` — todo id entrante del batch, ya que
    tras el merge de `syncCollection` cada id queda representado en la BD (sea porque se agregó,
    se actualizó, o porque la versión de BD ya era más reciente y se mantuvo). El cliente puede
    usar esta lista para marcar esos recibos locales como `synced` (resuelve el TODO
    `savedReciboIds` que existía comentado en el código).

### `POST /sync/Arriendo`

- Body: `{ arriendo: Arriendo, lastSyncedTimestamp? }`.
- Valida que `arriendo.direccion` (case-insensitive) coincida con `house.direccion` → si no,
  `409` "Su dirección registrada no es la misma que la almacenada...".
- Sobrescribe `house.arriendo = arriendo` completo (no usa `syncCollection`, porque es un objeto
  único, no una colección).
- Respuesta: `201 { id, syncedCount: 1 }` — nota: en el working tree actual (sin commitear) esto
  cambió de `200`/`syncedCount: null` a `201`/`syncedCount: 1`; si se lee el código en otro
  momento, confirmar cuál versión está activa.

### `syncCollection()` — resolución de conflictos

Función helper reutilizada por `Ahorros`, `Facturas` y `Recibos`. Por cada item entrante:

1. Busca un item existente en la colección de BD cuyo campo `propiedadUnica` (`"_id"` o
   `"tipo"` según la ruta) coincida.
2. Si existe: compara `timestamp` de BD vs. `timestamp` entrante (parseados a `Date`) — **si el
   entrante es más reciente, sobrescribe** el item completo. Si no, lo deja igual. Es
   last-write-wins **a nivel de item individual**, no a nivel de colección completa.
3. Si no existe: lo agrega (`push`) a la colección.

Este es el mecanismo real de "Server as Source of Truth con resolución por timestamp" — pero
opera dato por dato, no como una regla global de "todo el house es más reciente o no".

## Reconciliación con las preguntas abiertas del cliente

Respuestas a las 5 preguntas de `Mi_Primer_Electron/Doc/CONTRATO_SERVIDOR.md` (solo documentadas
aquí; ese archivo no se modifica desde esta sesión):

1. **¿El servidor devuelve `lastSyncedTimestamp` como `{ house, user }`?** Depende del endpoint.
   `POST /sync/Ahorros|Facturas|Recibos` sí devuelven `{ lastSyncedTimestamp: { user, house } }`.
   `GET /sync/last-sync` devuelve un valor **plano** (solo el de la casa), no un objeto
   `{house, user}`. El cliente debe tratar ambos casos distinto.
2. **¿Existe `/auth/authenticate`?** No. Solo existen `POST /auth/register` y `POST
   /auth/login` bajo el prefijo `/auth`. El canal IPC `syncUtils.autenticate` del cliente,
   mencionado en su documento, no tiene contraparte real en este servidor — confirma que es
   código muerto/no conectado del lado cliente.
3. **¿El servidor espera password en texto plano?** Confirmado: sí, en ambos endpoints de
   `/auth`. El hash se genera server-side con bcrypt; el cliente nunca debe mandar un hash
   propio.
4. **¿Cómo maneja el servidor el campo `REFERENCIA` de `Factura`?** No lo maneja — el campo
   **no existe** en `TipoFacturaSchema` ni en la interfaz `TipoFactura` del servidor. Sigue
   pendiente de implementación server-side (relacionado con el TODO "cuenta contrato" en
   `Doc/TODO.md`).
5. **¿El significado de `fechaDePago`/`timestamp` en `Recibo` coincide del lado servidor?** El
   servidor no tiene ninguna lógica que interprete el significado de estos dos campos — los
   persiste tal cual como `String`, sin validación semántica. No hay forma de confirmar desde el
   servidor cuál de los dos lados (cliente o servidor) tiene la interpretación "correcta"; la
   decisión de qué significan sigue siendo responsabilidad del cliente/negocio, no algo que el
   esquema del servidor imponga hoy.
