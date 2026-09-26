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
import filesRouter from './routes/files.js'
// Middleware
import { corsMiddleware } from './middleware/cors.js'
import { logger } from './utils/logger.js'
import { startFileServer } from './fileServer/fileServer.js'

const app = express()

app.disable('x-powered-by')
app.use(json())
app.use(corsMiddleware())

// Driver a MongoDB
mongoose.connect('mongodb://localhost/appCuentas')
.then(() => {
    logger.info('MongoDB', 'Conectado a MongoDB')
}).catch(err => {
    logger.critical('MongoDB', 'Error al conectarse con MongoDB, Error:', err)
})

// Rutas

// Ruta de Autenticacion
app.use('/auth', authRouter)

// Ruta de Busqueda
// app.use('/search')

// Ruta de Sincronizacion
app.use('/sync', syncRouter)

// Ruta "CDN": gateway autenticado que hace de reverse proxy hacia el servicio interno
// de archivos (src/fileServer.ts), separando responsabilidades BD (Mongo) - Archivos (disco)
app.use('/cdn', filesRouter)

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
    logger.info('Server', `Server RESTFUL Online. Escuchando en el puerto ${PORT}. Direccion http://${HOST}:${PORT}`)
})

// Servicio interno de archivos (mismo proceso, puerto aparte, solo 127.0.0.1) — ver
// src/fileServer/fileServer.ts. El Express principal lo alcanza via reverse proxy en /cdn.
startFileServer()

// Ciclo de vida del proceso: al apagar el servidor (Ctrl+C u orden del sistema),
// se espera a que el worker del logger termine de escribir lo pendiente antes de
// cerrar la conexion a Mongo y salir.
const shutdown = async (signal: string) => {
    logger.info('Shutdown', `Señal ${signal} recibida, apagando servidor...`)
    await logger.shutdown()
    await mongoose.disconnect()
    process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

// Export para los test
export default app