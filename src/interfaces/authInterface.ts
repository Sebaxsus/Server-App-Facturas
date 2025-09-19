import { type Request } from "express"
import { type UserDataDTO } from "./interfaces.js"

// Esta interfaz describe las propiedades de user que
// Necesito usar luego de Autenticar a un usuario usando
// JWT, Si se autentica correctamente se inyecta
// la propiedad/campo al cuerpo de la Peticion (Request)
// Para acceder a los datos usando req.user.(Propiedad)
export interface AuthRequest extends Request {
    user?: { 
        userId: string,
        houseId: string,
    }
}

export interface SyncRequest<T> extends AuthRequest {
    body: T & {
        lastSyncedTimestamp: string,
    }
}