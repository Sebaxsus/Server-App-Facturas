import dotenv from 'dotenv'
// Cargando las variables de entorno antes de importar cualquier
// Dependencia o Modulo,
// 
// Ya que asi me aseguro que esten cargadas antes de entrar a cualquier
// Otra dependencia o Modulo que necesite las ENV
// Spoiler -> En TS no sirve si no se Transpila el Code en lugar de Compilar
// a JS 😡
dotenv.config()

const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || ""
const JWT_SECRET = process.env.JWT_SECRET || "putoDotEnv&PutoTS"

// Constante para escuchar en todas las IPs locales disponibles 0 - 255
const HOST = "0.0.0.0" //getLocalIPAddress() || all posible hosts

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET debe ser definida y cargada correctamente como variable de entorno')
}

import express from "express"
import { json, type Request, type Response } from "express"
import mongoose from "mongoose"

// Routers
import syncRouter from "./routes/sync.js"
import authRouter from './routes/auth.js'
// Middleware
import { corsMiddleware } from './middleware/cors.js'

const app = express()

app.disable('x-powered-by')
app.use(json())
app.use(corsMiddleware())

// Driver a MongoDB
mongoose.connect('mongodb://localhost/appCuentas')
.then(() => {
    console.log('Conectado a MongoDB')
}).catch(err => {
    console.log('Error al conectarse con MongoDB, Error:', err)
})

// Rutas

// Ruta de Autenticacion
app.use('/auth', authRouter)

// Ruta de Busqueda
// app.use('/search')

// Ruta de Sincronizacion
app.use('/sync', syncRouter)

// Ruta verificacion servidor Online
app.get("/ping", (req: Request, res: Response) => {
    res.status(200).json({
        message: 'Pong!, Servidor Online',
        health: 'up',
    })
})

app.use((req, res) => {
    res.status(404).json({message: 'Revise la ruta usada, Route Not Found 404!'})
})


app.listen(PORT, () => {
    console.log(`Server RESTFUL Online\nEscuchando en el puerto ${PORT}\nDireccion http://${HOST}:${PORT}`)
})

// Export para los test
export default app