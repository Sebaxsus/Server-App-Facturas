export interface MovimientoAhorro {
    _id: string
    movimiento: string
    fecha: string
    monto: number
    usuario: string
    timestamp: string
    syncStatus?: 'pending' | 'synced'
}
// el Signo de Interrogacion al final de syncStatus '?'
// Indica que ese Atributo / Parametro es opcional

export interface Recibo {
    _id: string
    fechaDeRecibo: string
    comprobante: string
    timestamp: string
    syncStatus?: 'pending' | 'synced'
}

export interface Factura {
    _id: string
    tipo: string
    empresa: string
    paginaDePago: string
    fechaDeLlegada: string
    recibos: Recibo[]
}

export interface PagoArriendo extends Recibo  {
    estado: string
}

export interface Arriendo {
    fechaDePago: string
    direccion: string
    arrendatario: string
    pagos: PagoArriendo[]
}

export interface UserData {
    Ahorros: MovimientoAhorro[]
    Facturas: Factura[]
    Arriendo: Arriendo
    lastSyncedTimestamp: Date
}

/* 
    Esta es una solucion para el problema que genera
    la comunicacion entre el Cliente y Servidor usando
    Objetos como JSON en el cual no existe el Tipo Date,

    Por ende al usar la Interfaz con el Tipo String a un
    Esquema el cual debe tener un Tipo Date genera errores
    de tipos.

    Para solucionar esto encontre dos opciones:
        1. Separar las interfaces entre la que recibo
        Data Transfer Object (DTO) y la que Persisto,
        Con este tendria que agruegar la logica de Parseo/Conversion
        de Tipo String a Date

        2. Usar un **set** (setter), De esta manera Mongoose
        se encargara de convertir los String Formato Date ISO
        a un Date.
*/
export interface UserDataDTO {
    Ahorros: MovimientoAhorro[]
    Facturas: Factura[]
    Arriendo: Arriendo
    lastSyncedTimestamp: string
}

// export interface UserData {
//     Ahorros: MovimientoAhorro[]
//     Facturas: Factura[]
//     Arriendo: Arriendo
//     lastSyncedTimestamp: string
// }