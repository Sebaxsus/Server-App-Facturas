import cors, { type CorsOptions } from "cors"

//Modificar la cabecera para permitir las peticiones de navegadores
//Mediante CORS (Cross Origin Resources Share)

// Metodos Normales: GET/HEAD/POST
// Metodos Complejos:  PUT/PATCH/DELETE

// CORS PRE-Flight Request: Es una peticion que se hace antes de una peticion compleja
//Para saber si se puede hacer la peticion compleja
//El navegador hace una peticion OPTIONS para saber si se puede hacer la peticion compleja
//Si el servidor responde con un 200, el navegador procede a hacer la peticion compleja
//Si el servidor responde con un 404-405, el navegador no hace la peticion compleja
//Si el servidor responde con un 500-521, el navegador no hace la peticion compleja
//Por eso es importante configurar el OPTIONS
//El OPTIONS es una peticion que se hace antes de una peticion compleja
//Para saber si se puede hacer la peticion compleja

//Cuando hay problemas de CORS es REALMENTE un problema de cabeceras (HEADERS)

const ACCEPTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost/'
]

// 
interface CorsMiddlewareOptions {
    acceptedOrigins?: string[]
}

//Agregando el cors de la Libreria CORS
const corsMiddleware = ({acceptedOrigins = ACCEPTED_ORIGINS}: CorsMiddlewareOptions = {}) => {
    const options: CorsOptions = {
        origin : (origin, callback) => {
            console.log("Entro a peticion siguiendo con esta code 100 origin: ", origin)
            // Si el origen no existe (AKA es una Peticion de el Mismo Servidor o Local)
            if (!origin) {
                return callback(null,true)
            }
            // Si el origen esta dentro de el arreglo de Origenes Aceptados
            if (acceptedOrigins.includes(origin)) {
                return callback(null, true)
            }


            return callback(new Error('No Permitido Por CORS'))
        }
    }
    return cors(options)
}

export { ACCEPTED_ORIGINS, corsMiddleware }