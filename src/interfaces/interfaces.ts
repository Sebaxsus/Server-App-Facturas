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
    lastSyncedTimestamp: string
}