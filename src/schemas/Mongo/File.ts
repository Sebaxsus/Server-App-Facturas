import mongoose, { Document, Schema } from "mongoose";

// Metadata de un archivo guardado en el servicio interno de archivos (src/fileServer).
// _id es el mismo id que devuelve POST /store en el servicio interno — un solo id
// compartido entre el disco (nombre de archivo) y Mongo (metadata).
// Generico: no esta atado a "recibo" especificamente, se puede reusar para foto de
// perfil u otros archivos a futuro.
export interface IFile extends Document {
    _id: string,
    houseId: mongoose.Types.ObjectId,
    ownerUserId: mongoose.Types.ObjectId,
    mimetype: string,
    originalName: string,
    size: number,
}

const fileSchema = new Schema<IFile>({
    _id: { type: String, required: true },
    houseId: { type: Schema.Types.ObjectId, ref: 'House', required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mimetype: { type: String, required: true },
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
}, { _id: false, timestamps: true })

const File = mongoose.model<IFile>('File', fileSchema)

export {
    File
}
