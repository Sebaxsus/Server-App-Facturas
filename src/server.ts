import dotenv from 'dotenv'
import express from "express"
import { json, type Request, type Response } from "express"
import mongoose from "mongoose"

// Routuers
import syncRouter from "./routes/sync.js"
import authRouter from './routes/auth.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || ""

app.disable('x-powered-by')
app.use(json)

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

app.use((req, res) => {
    res.status(404).json({message: 'Revise la ruta usada, Route Not Found 404!'})
})


app.listen(PORT, () => {
    console.log(`Server RESTFUL Online\nEscuchando en el puerto ${PORT}\nDireccion http://localhost:${PORT}`)
})

// Export para los test
export default app