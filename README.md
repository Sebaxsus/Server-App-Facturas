# Server-App-Facturas
Servidor encargado de almacenar y sincronizar los clientes dentro de una red local 

## Diseño de Datos y Almacenamiento

### Almacenamiento Relacional en MongoDB Usando mongoose

El modelo de almacenamiento es definido por **dos colecciones** (Tablas) Relacionadas entre si

1. Colección Principal **Casa**:
    > Esta conformada por:
    >
    > - **_id** (String): Identificador único Generado por mongo.
    > - **dirección** (String): Dirección física de la Casa/Apartamento.
    > - **UsersIds** (Array\<Number>): Arreglo de Identificadores de todos los usuarios ligados a la Casa/Apartamento.
    > - **Ahorros** (Array\<MovimientoAhorro>): Arreglo de transacciones de la caja de ahorros común de la casa (_id, movimiento, fecha, monto, usuario(username), timestamp, syncStatus).
    > - **tiposFacturas** (Array\<Factura>): Arreglo de Objectos con los datos de cada Tipo de Factura (_id, tipo, empresa, PaginaDePago, FechaDeLLegada).
    > - **recibosFacturas** (Array\<Recibo>): Arreglo de Recibos de todos los Tipos de facturas (_id, tipoId, fechaDePago, comprobante, timestamp, syncStatus, estado).
    > - **arriendo** (Object\<Arriendo>): Objecto/Esquema con las propiedades (_id, fechaDePago, arrendatario).
    > - **recibosArriendo** (Array\<Recibo>): Arreglo de Recibos de el Arriendo (_id, tipoId{Arriendo}, _fechaDePago, comprobante, timestamp, syncStatus, estado).
    > - **lastSyncedTimestamp** (Date): Fecha de la ultima actualización, Su finalidad es permitir comparar la fecha de sincronización con el cliente y actualizar los datos en el cliente o en el servidor/DB.
    > ---
    > --- Colección Casa.
2. Colección Secundaria **Usuario**:
    > Esta conformada por:
    >
    > - **_id** (String): Identificador único generado por Mongo.
    > - **username** (String): Nombre de usuario único.
    > - **passwordHash** (String): Cadena de caracteres encriptados de la contraseña.
    > - **casaId** (String): Identificador único referenciando la colección de datos de la casa.
    > - **Ahorros** (Array\<MovimientoAhorro>): Arreglo de transacciones de la caja de ahorros personal (_id, movimiento, fecha, monto, usuario(username), timestamp, syncStatus).
    > lastSyncedTimestamp: (Date): Fecha de la ultima sincronización de el usuario, Se usa para verificar que esta al dia los datos entre el Cliente y la Base de Datos.
    > ---
    > --- Colección Usuario.
        