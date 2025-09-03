import { type Request } from "express"
import { type UserDataDTO } from "./interfaces.js"

export interface AuthRequest extends Request {
    user?: { 
        userId: string 
    }
}

export interface SyncRequest<T> extends AuthRequest {
    body: T & {
        lastSyncedTimestamp: string
    }
}