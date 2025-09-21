import { type Request } from "express"
import type { Schema } from "mongoose"
// import type { MovimientoAhorro, TipoFactura, Arriendo } from "./interfaces.js"

// Esta interfaz describe las propiedades de user que
// Necesito usar luego de Autenticar a un usuario usando
// JWT, Si se autentica correctamente se inyecta
// la propiedad/campo al cuerpo de la Peticion (Request)
// Para acceder a los datos usando req.user.(Propiedad)
export interface AuthRequest extends Request {
    user?: { 
        userId: string
    }
    // userData?: {
    //     userId: string,
    //     houseId: string,
    //     lastSyncedTimestamp: String | Date | null, 
    // },
    // houseData?: {
    //     houseId: string,
    //     direccion: string,
    //     // usersId: [string], // Para mi que siguie estan la relacion uno a mucho pero aja!
    //     ahorros: MovimientoAhorro[],
    //     tipoFactura: TipoFactura[],
    //     arriendo: Arriendo,
    //     lastSyncedTimestamp: String | Date | null, 
    // }
}

// Se incluye houseId dentro de la Prop user
// Ya que es parte de la Info de User tener la
// Id de la casa a la que esta vinculado.

export interface DocRequest extends AuthRequest {
    user?: {
        userId: string,
        houseId: Schema.Types.ObjectId
    }
}

export interface SyncRequest<T> extends DocRequest {
    body: T & {
        lastSyncedTimestamp: string,
    }
}