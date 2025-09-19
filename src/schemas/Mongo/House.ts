import mongoose, { Document, Schema } from "mongoose";

import type { HouseData, MovimientoAhorro, TipoFactura, Arriendo, Recibo } from "../../interfaces/interfaces.js";
import { MovimientoAhorroSchema, TipoFacturaSchema, ArriendoSchema, RecibosSchema } from "./SubSchema.js";

// Definiendo el documento house Mongoose
export interface IHouse extends Document, HouseData {
    houseId: string,
    direccion: string,
    // usersId: [string], // Para mi que siguie estan la relacion uno a mucho pero aja!
    ahorros: MovimientoAhorro[],
    tipoFactura: TipoFactura[],
    arriendo: Arriendo,
    recibosFacturas: Recibo[],
    recibosArriendo: Recibo[],
    // lastSyncedTimestamp: Date | null, // Este campo se herada de la Interfaz HouseData
}

const houseSchema = new Schema<IHouse>({
    houseId: { type: String, required: true, unique: true, index: true },
    direccion: { type: String, required: true, unique: true },
    ahorros: [MovimientoAhorroSchema],
    tipoFactura: [TipoFacturaSchema],
    arriendo: ArriendoSchema,
    recibosFacturas: [RecibosSchema],
    recibosArriendo: [RecibosSchema],
    lastSyncedTimestamp: {
        type: Schema.Types.Date,
        set: (value: string | Date | null | undefined) => {
            if (!value) return value
            return value instanceof Date ? value : new Date(value)
        },
        required: false,
        default: null
    }
})

const House = mongoose.model<IHouse>('House', houseSchema)

export {
    House,
}