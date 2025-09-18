// Creando sub esquemas para el Objeto de Arriendo en el Esquema User
import { Schema } from "mongoose";
import { type Arriendo, type PagoArriendo } from "../../interfaces/interfaces.js";

const PagoArriendoSchema = new Schema<PagoArriendo>({
    fechaDePago: { type: String, required: true },
    estado: { type: String, required: true },
    comprobante: { type: String, required: true },
    timestamp: { type: String, required: true },
    syncStatus: { type: String }
}, {_id: false})

const ArriendoSchema = new Schema<Arriendo>({
    fechaDePago: { type: String, required: true },
    direccion: { type: String, required: true },
    arrendatario: { type: String, required: true },
    pagos: [PagoArriendoSchema], // Arreglo de el Esquema PagoArriendo
}, {_id: false})

export {
    ArriendoSchema
}