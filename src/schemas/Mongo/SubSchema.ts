// Creando sub esquemas para el Objeto de Arriendo en el Esquema House
import { Schema } from "mongoose";
import type { Arriendo, Recibo, MovimientoAhorro, TipoFactura } from "../../interfaces/interfaces.js";

// _id -> UUID Generado por el Sistema de Guardado Local en el Cliente
// syncStatus -> Por defecto (En caso de que no venga en la peticion) es 'synced' ya que se esta "Sincronizando" 👍

// Porque usar un Sub-esquema (Esquema) en lugar de un Sub-documento ({type: Array<MovimientoAhorro>(), default: []})
// Esta pregunta se Responde dos Preguntas
// 1. Si ya tengo validacion con Interfaces en TypeScript, Porque deberia usar un esquema, Que hace lo mismo
// 2. Si no necesito controlar los campos y el Comportamiento de Mongo, Porque deberia usar un esquema.

// 1. Aunque TypeScript ya valide los campos, En caso de se pase el Objecto JSON a Mongo este no validara
// Sus propiedades ni que guarda, Solo Guardara el Objeto Directamente, Si un campo/Propiedad llega a pasar
// Vacia o con un Tipo incorrecto Mongo no lo validara si no tiene un Esquema definido; Por eso usar un Esquema
// Debe ser Obligatorio, Ya que este seria una Validacion mas en el Proceso de persistir los datos, Lo que conlleva
// A mas seguridad.

// 2. Porqué siempre se va a necesitar controlar algo, Ya sea la estructura de las Propiedades que se guardan
// , Si es una Propiedad/Campo Obligatorio o Si se necesita aplicar un Valor por defecto; Estos casos de uso
// Son algunas de las muchas razones por las que usar un Esquema siempre es útil,
// Ya que ofrece un control mas Granular Sobre Mongo (DB) y no el Servidor

// En resumen los esquemas Manejan en nivel mas alto la Base De Datos, Permitiendo:
// Validación a nivel de BD: 
//  A pesar de que TypeScript te ayuda en el código, una vez que los datos llegan al servidor 
//  (por ejemplo, desde otra API, un formulario sin validar, o un cliente malicioso), 
//  Mongoose es tu última línea de defensa. Un sub-esquema se asegura de que la estructura de tu 
//  JSON sea la correcta antes de guardarse. Por ejemplo, si un cliente envía un recibo sin la 
//  propiedad fechaDeRecibo, el sub-esquema lanzará un error, protegiendo la integridad de tus datos.

// Consistencia en Datos persistidos: 
// Al definir un sub-esquema, estás creando un "modelo" de datos reusable. 
// Si en el futuro necesitas validar un recibo en otro documento de tu base de datos, 
// simplemente puedes reutilizar el ReciboSchema, 
// asegurando que la estructura sea siempre la misma en toda tu aplicación.

// Control Granular Con un sub-esquema, puedes definir propiedades como required, default 
// o incluso unique (aunque unique en sub-documentos puede ser complejo).
// Esto te da un control mucho más fino sobre tus datos.

// Ahorros

const MovimientoAhorroSchema = new Schema<MovimientoAhorro>({
    _id: { type: String, required: true, index: true },
    movimiento: { type: String, required: true },
    fecha: { type: String, required: true },
    monto: { type: Number, required: true },
    usuario: { type: String, required: true },
    timestamp: { type: String, required: true },
}, { _id: false, })
// Usar la opcion _id: false, Le indica a Mongo que no genere un _id automatico
// Esto se va a manejar en el Cliente usando Universal Unique Identifier (UUID)
// Es decir lo genero en el Cliente 👍


// Facturas

const RecibosSchema = new Schema<Recibo>({
    _id: { type: String, required: true, index: true },
    tipoFacturaId: { type: String, required: true },
    fechaDePago: { type: String, required: true },
    comprobante: { type: String, required: true },
    timestamp: { type: String, required: true },
    estado: { type: String, default: 'pendiente' }
}, { _id: false })
// Usar la opcion _id: false, Le indica a Mongo que no genere un _id automatico
// Esto se va a manejar en el Cliente usando Universal Unique Identifier (UUID)
// Es decir lo genero en el Cliente 👍

const TipoFacturaSchema = new Schema<TipoFactura>({
    //_id: { type: String, index: true }, // Al no declarar _id mongo lo creara automaticamente con un Generador de ID unicas
    tipo: { type: String, required: true },
    empresa: { type: String, required: true },
    paginaDePago: { type: String, required: true },
    fechaDeLlegada: { type: String, required: true} // Fecha en String Formato Date ISO
}, { _id: true })
// Mantego el hecho que si cree el Indice con el esquema

// Arriendo

const ArriendoSchema = new Schema<Arriendo>({
    fechaDePago: { type: String, required: true },
    direccion: { type: String, required: true },
    arrendatario: { type: String, required: true }
}, { _id: true })

export {
    MovimientoAhorroSchema,
    RecibosSchema,
    TipoFacturaSchema,
    ArriendoSchema,
}