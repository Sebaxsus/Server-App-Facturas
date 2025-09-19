import mongoose, { Document, Schema } from "mongoose";
import bcrypt from 'bcrypt'
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

import type { MovimientoAhorro, UserData } from "../../interfaces/interfaces.js";
import { MovimientoAhorroSchema } from "./SubSchema.js";
import { House } from "./House.js";

// Definiendo el tipo de Documento Mongoose
export interface IUser extends Document, UserData {
    userId: string,
    username: string,
    passwordHash: string,
    houseId: string, // Relacion entre una Casa a muchos Usuarios
    ahorros: MovimientoAhorro[],
    // lastSyncedTimestamp: Date | null, // Este campo se herada de la Interfaz UserData
    comparePassword: (password: string) => Promise<boolean>, // Describiendo el metodo para que TS lo reconosca al Instancia desde el Objeto Mongoose generico
}

// El Esquema user usa de Referencia en HouseId un modelo de House (Instancia de el Esquema)

const userSchema = new Schema<IUser>({
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }, 
    houseId: { type: String, ref: House, required: true, index: true },
    ahorros: [MovimientoAhorroSchema],
    lastSyncedTimestamp: {
        type: Schema.Types.Date,
        set: (value: string | Date | null | undefined) => {
            // Setter encargado de Parsear el String Formato Date ISO a Date
            if (!value) return value
            return value instanceof Date ? value : new Date(value)
        },
        required: false,
        default: null
    }
})
// [Info de porque de referencia se usa el Modelo](https://mongoosejs.com/docs/api/schematype.html#SchemaType.prototype.ref())

const User = mongoose.model<IUser>('User', userSchema)
// [Mas info Sobre Models](https://mongoosejs.com/docs/models.html)
// Basicamente la Instancia de el Modelo (Mongoose) crea el Documento (Mongo)


// Metodo para comparar contraseñas
userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash)
}

export {
    User,
}