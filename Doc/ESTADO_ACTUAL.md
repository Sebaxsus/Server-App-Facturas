# Estado Actual del Proyecto

> Fotografía puntual del backend tomada el **2026-09-04**, hecha releyendo todo el código y la
> documentación existente (excepto `node_modules/` y `dist/`, fuera de alcance). No es un
> documento vivo: si el código cambia, esto puede quedar desactualizado — para reglas de cómo
> mantenerlo, ver `CLAUDE.md` en la raíz del proyecto.
>
> Los bugs puntuales listados aquí están también como tareas accionables en `Doc/TODO.md`, bajo
> el encabezado "Hallazgos de la revisión del 2026-09-04". Este documento da la vista de
> arquitectura y panorama general; `TODO.md` da el checklist de trabajo. Para el contrato
> técnico de endpoints/esquemas, ver `Doc/CONTRATO_SERVIDOR.md`.
>
> **Actualizado 2026-09-17**: se implementaron 3 features que bloqueaban probar la comunicación
> cliente-servidor por primera vez (refresh token, ahorros personales, confirmación de recibos
> sincronizados por id) y se corrigieron algunos de los bugs menores de auth/sync listados en la
> sección 5 — ver `Doc/TODO.md`, sección "Hallazgos de la revisión del 2026-09-17", para el
> detalle de qué se marcó como resuelto.

## 1. Arquitectura

Backend en **Node/TypeScript** (ESM puro, `module: nodenext`), Express 5 + Mongoose 8, sin
capas de `controllers/`/`services/` separadas — la lógica de negocio vive directamente en los
handlers de `src/routes/`. Diseñado como "Server as Source of Truth" para un cliente Electron
local-first (`Mi_Primer_Electron`, repo separado).

### Punto de entrada — `src/server.ts`

Carga `dotenv.config()` antes de cualquier otro import (con un comentario del autor explicando
que en TS puro sin transpilar esto no funciona igual). Lee `PORT`, `MONGO_URI` y `JWT_SECRET`
de entorno, arma la app Express (`json()`, `corsMiddleware()`), conecta a Mongo, monta los
routers `/auth` y `/sync`, expone `GET /ping` inline, y responde `404` genérico para cualquier
otra ruta.

### Estructura de `src/`

```
src/
├── server.ts                # Punto de entrada
├── interfaces/
│   ├── authInterface.ts     # AuthRequest, DocRequest, SyncRequest<T>
│   └── interfaces.ts        # MovimientoAhorro, Recibo, TipoFactura, Arriendo, UserData, HouseData
├── middleware/
│   ├── authMiddleware.ts    # authToken: valida JWT
│   ├── cors.ts              # corsMiddleware: orígenes permitidos
│   └── documentValidation.ts # validateDoc: resuelve houseId, valida existencia en BD
├── routes/
│   ├── auth.ts              # POST /register, POST /login (montado bajo /auth)
│   ├── ping.ts               # GET /ping — NO montado en server.ts (código muerto)
│   └── sync.ts               # GET /last-sync, POST /Ahorros, /Facturas, /Recibos, /Arriendo
├── schemas/Mongo/
│   ├── House.ts
│   ├── User.ts
│   └── SubSchema.ts          # Sub-schemas embebidos
└── utils/
    └── utils.ts               # getLocalIPAddress() — no usada en ningún otro archivo
```

No hay carpetas `tests/` (solo `Test/API.http`, requests manuales, no tests automatizados). El
directorio `dist/` es el espejo compilado de `src/` (fuera de alcance de esta revisión).

### Cadena de middleware en rutas de sync

`authToken` (valida JWT, inyecta `req.user.userId`) → `validateDoc` (resuelve `houseId` desde
`User`, valida existencia de `User`/`House` en BD, inyecta `req.user.houseId`) → handler de la
ruta. `/auth/*` y `/ping` no pasan por ningún middleware de autenticación.

## 2. Inventario de endpoints

| Ruta | Método | Middleware | Estado |
| --- | --- | --- | --- |
| `/auth/register` | POST | ninguno | Funcional, con bugs menores (ver sección 5) |
| `/auth/login` | POST | ninguno | Funcional |
| `/auth/refresh` | POST | ninguno | Funcional — **nuevo 2026-09-17** |
| `/sync/last-sync` | GET | `authToken`, `validateDoc` | Funcional |
| `/sync/Ahorros` | POST | `authToken`, `validateDoc` | Funcional |
| `/sync/Facturas` | POST | `authToken`, `validateDoc` | Funcional, sin validación de input dedicada (TODO explícito) |
| `/sync/Recibos` | POST | `authToken`, `validateDoc` | Funcional, con bugs de mensaje y supuestos no validados (ver sección 5) |
| `/sync/Arriendo` | POST | `authToken`, `validateDoc` | Funcional |
| `/ping` (inline en `server.ts`) | GET | ninguno | Funcional |
| `/ping` (`src/routes/ping.ts`) | GET | ninguno | **No montado** — código muerto, nunca se importa en `server.ts` |
| `/search` | — | — | Nunca implementado, solo un comentario `// app.use('/search')` en `server.ts` |
| cualquier otra ruta | * | catch-all | `404 { message: 'Revise la ruta usada, Route Not Found 404!' }` |

## 3. Hecho vs. pendiente (nivel de features)

**Hecho:**
- Registro/login con JWT (`expiresIn: '1h'`), hash de password con bcrypt.
- Modelo de "hogar compartido": varios usuarios pueden vincularse a la misma `House` por
  `direccion`.
- Sincronización incremental por colección (`Ahorros`, `Facturas`, `Recibos`, `Arriendo`) con
  resolución de conflictos por `timestamp` a nivel de item (`syncCollection()`).
- Distinción de recibos de `Facturas` vs. `Arriendo` en `/sync/Recibos` vía el parámetro `tipo`
  (ítem ya marcado como hecho en `Doc/TODO.md`).
- CORS básico restringido a los orígenes de desarrollo conocidos.
- **Refresh token (2026-09-17)**: `POST /auth/refresh` con JWT stateless de renovación
  (`type: 'refresh'`, `7d`), devuelto también por `/auth/register` y `/auth/login`. `authToken`
  rechaza un `refreshToken` usado como token de acceso.
- **Ahorros personales (2026-09-17)**: `POST /sync/Ahorros` distingue `type: 'personal'` (sincroniza
  `User.ahorros`) de `type: 'casa'`/default (sincroniza `House.ahorros`, comportamiento previo).
- **Confirmación de recibos sincronizados por id (2026-09-17)**: `POST /sync/Recibos` devuelve
  `ids` con los ids del batch entrante, para que el cliente marque esos recibos como `synced`.

**Pendiente (a nivel de feature, no bugs puntuales — ver `Doc/TODO.md` para el detalle):**
- Soporte mDNS/Bonjour para exponer el servidor por nombre de host en la red local
  (`getLocalIPAddress()` existe pero no está conectado a nada).
- Testing automatizado: no hay `jest` ni `mongodb-memory-server` instalados, no hay script
  `npm test`, no hay carpeta de tests — solo `Test/API.http` para pruebas manuales.
- Endpoint `update` en Auth para cambiar password/dirección/usuario.
- Campo `REFERENCIA` / "cuenta contrato" en `Factura` (no existe en el schema del servidor).
- Logout / invalidación real de tokens (el refresh token implementado el 2026-09-17 es
  stateless — no hay lista de revocación ni forma de invalidarlo antes de su expiración de `7d`),
  roles/permisos.
- Rate limiting / protección contra fuerza bruta en `/auth/login`, `/auth/register` y
  `/auth/refresh`.
- Subida real de archivos vía `multer` (dependencia instalada, sin usar en ningún archivo) —
  hoy `comprobante` viaja como string base64 dentro del JSON.
- Middleware dedicado de validación de body para `/sync/Facturas` y `/sync/Recibos` (dos TODOs
  explícitos en el código, ver sección 5).

## 4. Decisiones de diseño sin resolver

- **`MONGO_URI` declarada pero ignorada**: se lee de env en `server.ts` pero la conexión real
  usa un string hardcodeado (`mongodb://localhost/appCuentas`). Cualquier valor puesto en
  `.env` para `MONGO_URI` no tiene efecto hoy.
- **Quién genera `lastSyncedTimestamp`**: la regla general es que `house.lastSyncedTimestamp`
  siempre lo pone el servidor y `user.lastSyncedTimestamp` siempre lo manda el cliente — pero en
  `/sync/Recibos`, el campo `tipoFactura[i].lastSyncedTimestamp` a veces toma la fecha del
  cliente si viene en el body. El propio autor deja un comentario reconociendo la confusión:
  *"Esto me pone a pensar que como el server es el 'Indicador de Verdad Absoluta' El server
  siempre deberia ser el que crea la fecha de lastSyncTimestamp."* Queda sin resolver.
- **`JWT_SECRET` con fallback hardcodeado inseguro**: `process.env.JWT_SECRET || "putoDotEnv&PutoTS"`,
  repetido de forma idéntica en `server.ts`, `authMiddleware.ts` y `auth.ts`. Si la variable de
  entorno no carga (el propio autor documenta que tuvo problemas de carga de `dotenv` en algunos
  archivos), el servidor sigue funcionando pero con un secreto público visible en el código
  fuente.

## 5. Bugs e inconsistencias conocidas

Cada uno tiene su checkbox correspondiente en `Doc/TODO.md`, sección "Hallazgos de la revisión
del 2026-09-04". Resumen por archivo:

- **`src/server.ts`**: `MONGO_URI` leída de env pero nunca usada (conexión hardcodeada); ruta
  `/search` comentada, nunca implementada; existe un `pingRouter` en `src/routes/ping.ts` que
  nunca se monta (duplicado con distinta forma de respuesta respecto al `/ping` inline).
- **`src/middleware/authMiddleware.ts`**: en el working tree actual (sin commitear) hay un
  `console.log` reactivado que imprime el JWT crudo recibido — riesgo de exposición de
  credenciales en logs. ~~el error `498` devuelve el objeto de error completo de `jsonwebtoken`
  en el body~~ y ~~el middleware no valida el esquema del header `Authorization`~~ — **ambos
  resueltos 2026-09-17**: el `498` ahora responde un mensaje genérico (el error real solo se
  loguea server-side), y el esquema `Bearer` se valida explícitamente.
- **`src/routes/auth.ts`**: `console.log` que imprime `username`, `direccion` y **password en
  texto plano** tanto en registro como en login; `JWT_SECRET` logueado a consola al arrancar el
  módulo; `direccion.toLowerCase()` se ejecuta antes de validar que `direccion` exista en el
  body (si viene `undefined`, lanza una excepción no controlada específicamente, cae al `catch`
  genérico de `500` en vez de dar un `400` claro).
- **`src/middleware/documentValidation.ts`**: hace dos queries separadas a `User.findById` por
  request (una para resolver `houseId`, otra más adelante para validar existencia) — redundante
  pero funcional; contiene un bloque grande de código comentado que inyectaba `req.userData` y
  `req.houseData` completos, con nota explícita del autor: *"Aumenta complejidad Inutil
  Actualmente 😓 Perdi el tiempo :'("* — intento abandonado deliberadamente.
- **`src/routes/sync.ts`**:
  - Endpoint genérico `POST /sync` (desestructuraba `Ahorros`, `Facturas`, `Arriendo` juntos)
    dejado como código muerto comentado, reemplazado por rutas separadas por colección.
  - ~~El mensaje de éxito de `/sync/Recibos` dice literalmente "Sincronización de Información de
    **Arreindo** completada"~~ — **resuelto 2026-09-17**, ahora varía según `tipo`.
  - Queda un TODO explícito sin resolver: migrar la validación de body a un middleware dedicado
    (en `/Facturas` y `/Recibos`). ~~Devolver `savedReciboIds` al cliente~~ — **resuelto
    2026-09-17**, la respuesta de `/sync/Recibos` ahora incluye `ids`.
  - `/sync/Recibos` asume que **todos** los recibos del batch pertenecen a la misma factura,
    determinándolo solo a partir de `recibos[0]?.tipoFacturaId`, sin validar el resto del array.
  - `/sync/Arriendo` no valida `houseId` explícitamente antes de usarlo (a diferencia de las
    otras tres rutas) — funciona porque `validateDoc` ya lo garantiza antes de llegar al
    handler, pero es una inconsistencia de estilo.
  - En el working tree actual (sin commitear), la respuesta de `/sync/Arriendo` cambió de `200`
    con `syncedCount: null` a `201` con `syncedCount: 1`.
- **`src/interfaces/authInterface.ts`** y **`src/interfaces/interfaces.ts`**: bloques de código
  muerto comentado con diseños descartados — interfaces `userData`/`houseData` completas (mismo
  intento abandonado que en `documentValidation.ts`), y una versión antigua de `UserData` con
  propiedades en mayúsculas (`Ahorros`, `Facturas`, `Arriendo`).
- **`src/schemas/Mongo/House.ts`** / **`User.ts`**: campos comentados de un diseño anterior
  (`houseId` como string manual, `usersId` como array, `userId` como string) — descartados a
  favor de dejar que Mongo autogenere `_id` y usar referencias (`ref`) reales entre colecciones.
- **`Test/API.http`**: un ejemplo usa `Authorization: Basic <token>` en vez de `Bearer` (funciona
  solo porque `authMiddleware.ts` no valida el esquema); el payload de prueba de `/sync/Arriendo`
  no incluye el campo `valor`, que el schema marca como `required` — probablemente fallaría si
  se ejecuta tal cual; contiene tokens JWT reales embebidos como ejemplo (ver sección 6).
- **Sin dependencias de testing instaladas** (`jest`, `mongodb-memory-server`) pese a estar
  listadas como pendientes en `Doc/TODO.md`.
- **`multer`** instalado en `package.json` pero no usado en ningún archivo de `src/` —
  probablemente destinado a la subida real de comprobantes, hoy manejados como string base64.

## 6. Verificación de datos sensibles

- `.env` no está trackeado por git (verificar que siga en `.gitignore` antes de cualquier
  commit futuro); `.env.example` sí está trackeado y solo contiene placeholders
  (`MONGO_URI`, `JWT_SECRET`, `PORT`).
- `Test/API.http` contiene tokens JWT reales embebidos como ejemplo de request. No se determinó
  en esta revisión si siguen vigentes (los JWT expiran en 1h, por lo que probablemente ya no lo
  estén) — de todas formas, es una mala práctica dejar tokens reales en un archivo trackeado por
  git; queda como hallazgo en `Doc/TODO.md`.
