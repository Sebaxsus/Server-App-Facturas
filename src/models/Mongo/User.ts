import mongoose, { Document, Schema } from "mongoose";
/* 
Como los type alias, interfaces y clases usadas para tipar al compilar de TypeScript a JavaScript se eliminan ya que JavaScript no tiene tipos
Al momento de hacer un import normal `import { UserData} from '../../interfaces/interfaces.js'` TypeScript puede incluir ese módulo en el bundle aunque solo 
se use como tipo.

Para evitarlo se usa `import type {UserData} from '../../interfaces/interfaces.js'`,
Con esto al compilar ese `import type` no genera ningún import en el JavaScript Final
`from '../../interfaces/interfaces.js`

Asi evitando un import innecesario "require("./interfaces") (en CommonJS) o un import "./interfaces" (en ESModules)"
Ya que no es necesario en tiempo de ejecución.

En resumen:

    import type → garantiza que el import se elimina en tiempo de compilación, porque solo es un tipo.

    Si necesitas ambos, puedes mezclarlos
    import { crearPersona } from "./persona";
    import type { Persona } from "./persona";

    const juan: Persona = crearPersona("Juan", 25);

    Evita imports innecesarios en el bundle.

    Es muy útil en proyectos grandes o con bundlers (Webpack, Vite, etc.), porque reduce código muerto.
*/

import type { UserData, MovimientoAhorro, Factura, Arriendo } from "../../interfaces/interfaces.js";

// Definiendo el tipo de Documento Mongoose
interface IUser extends Document, UserData {
    userId: string
    lastSyncedTimestamp: Date
}

const userSchema = new Schema<IUser>({
    userId: { type: String, required: true, unique: true },
    lastSyncedTimestamp: {
        type: Schema.Types.Date,
        set: (value: string | Date) => {
            // Setter encargado de Parsear el String Formato Date ISO a Date
            if (!value) return value
            return value instanceof Date ? value : new Date(value)
        },
        required: false
    },
    Ahorros: { type: Array<MovimientoAhorro>(), default: [] },
    Facturas: { type: Array<Factura>(), default: [] },
    Arriendo: { type: Object, default: {} },
})

export const User = mongoose.model<IUser>('User', userSchema)