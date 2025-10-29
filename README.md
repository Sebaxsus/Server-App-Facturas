# Server-App-Facturas
Servidor encargado de almacenar y sincronizar los clientes dentro de una red local 

## Flujo de Comunicación Cliente -- Servidor

1. El cliente revisa todas las colecciones (Ahorros, Facturas, Arriendo) buscando que su **PROPIEDAD LOCAL** *(syncStatus)* sea "pending".
2. En caso de encontrar un registro con estado *"pending"*, Iniciara el proceso de sincronización de ese registro.
3. 
    - En caso de **NO** encontrar registros pendientes por sincronizar, Empezara el proceso de verificar con el servidor su fecha de sincronización.`lastSyncedTimestamp` y si esta atrasado actualizara los datos locales haciendo un "PULL" de los nuevos datos.
    - Si no hay registros pendientes (`pending`), el cliente consulta la `lastSyncedTimestamp` del servidor para determinar si la **Fuente de la Verdad (SOT)** posee datos más recientes. De ser así, el cliente inicia un **PULL** para sincronizar y actualizar sus datos locales.

## Diseño de Datos y Almacenamiento

Principio Fundamental: El Servidor como Fuente de la Verdad (Source of Truth - SOT)
El principio rector de este sistema de sincronización es el "Server as the Source of Truth" (SOT). Esto significa que la base de datos centralizada (MongoDB) contiene la versión definitiva, canónica y correcta de todos los datos.

1. Fiabilidad del Servidor: El servidor tiene la última palabra. Si hay un conflicto entre los datos locales del cliente y los datos del servidor, los datos del servidor siempre prevalecen.

2. Validación de Datos: El servidor es el único responsable de filtrar los datos duplicados y verificar la integridad de los datos antes de persistirlos, lo que garantiza la coherencia global.

### Modelo de la app

La aplicación se basa en un **Modelo de Sincronización Basado en "Pull's"**, Es decir el servidor es la fuente de información y el cliente decide cuándo solicitar actualizaciones. Es el estándar para este tipo de aplicaciones y es mucho más fiable que los modelos push (como los webhooks) para clientes sin conexión.

Al implementar marcas de tiempo tanto a nivel de usuario como de casa, no solo está rastreando un solo tiempo de sincronización, sino un tiempo de sincronización específico para un conjunto específico de datos, lo cual es esencial para la precisión.

### Almacenamiento Relacional en MongoDB Usando mongoose

El modelo de almacenamiento es definido por **dos colecciones** (Tablas) Relacionadas entre si

1. Colección Principal **Casa**:
    > Esta conformada por:
    >
    > - **_id** (String): Identificador único Generado por mongo.
    > - **dirección** (String): Dirección física de la Casa/Apartamento.
    > - **ahorros** (Array\<MovimientoAhorro>): Arreglo de transacciones de la caja de ahorros común de la casa (_id, movimiento, fecha, monto, usuario(username), timestamp).
    > - **tiposFacturas** (Array\<Factura>): Arreglo de Objectos con los datos de cada Tipo de Factura (_id, tipo, empresa, PaginaDePago, FechaDeLLegada).
    > - **recibosFacturas** (Array\<Recibo>): Arreglo de Recibos de todos los Tipos de facturas (_id, tipoId, fechaDePago, comprobante, timestamp, estado).
    > - **arriendo** (Object\<Arriendo>): Objecto/Esquema con las propiedades (_id, fechaDePago, arrendatario).
    > - **recibosArriendo** (Array\<Recibo>): Arreglo de Recibos de el Arriendo (_id, tipoId{Arriendo}, _fechaDePago, comprobante, timestamp, estado).
    > - **lastSyncedTimestamp** (Date): Fecha de la ultima actualización, Su finalidad es permitir comparar la fecha de sincronización con el cliente y actualizar los datos en el cliente.
    > ---
    > --- Colección Casa.
2. Colección Secundaria **Usuario**:
    > Esta conformada por:
    >
    > - **_id** (String): Identificador único generado por Mongo.
    > - **username** (String): Nombre de usuario único.
    > - **passwordHash** (String): Cadena de caracteres encriptados de la contraseña.
    > - **casaId** (String): Identificador único referenciando la colección de datos de la casa.
    > - **ahorros** (Array\<MovimientoAhorro>): Arreglo de transacciones de la caja de ahorros personal (_id, movimiento, fecha, monto, usuario(username), timestamp).
    > - **lastSyncedTimestamp** (Date): Fecha de la ultima sincronización de el usuario, Se usa para verificar que esta al dia los datos entre el Cliente y la Base de Datos en Local (Cliente), En Nube es para escribir los datos almacenados de el usuario en la Base de Dato en caso de que se pierdan los datos localmente o este en un nuevo dispositivo.
    > ---
    > --- Colección Usuario.
        