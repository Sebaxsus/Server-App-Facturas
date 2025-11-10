import { Router, type Request, type Response } from "express"
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import { User, type IUser } from "../schemas/Mongo/User.js"
import { House, type IHouse } from "../schemas/Mongo/House.js"
import mongoose, { Schema, type Document } from "mongoose"
import { json } from "stream/consumers"

const authRouter = Router()
const JWT_SECRET = process.env.JWT_SECRET || "putoDotEnv&PutoTS"
const SALT = 10

console.log("Secrent en AUTH: ", JWT_SECRET)

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET debe ser definida y cargada correctamente como variable de entorno')
}

// Ruta de registro
authRouter.post('/register', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body
        const direccion = req.body.direccion.toLowerCase()

        console.log("Registro de usuario: ", username, direccion, password)

        if (!username || !password || !direccion) {
            return res.status(400).json({ message: 'Username, password y direccion son requeridos' })
        }

        const existingUser = await User.findOne({ username })
        if (existingUser) {
            return res.status(409).json({ message: 'El usuario ya existe' })
        }

        const existingAddress = await House.findOne({ direccion }).select("_id")

        console.log("ExistingAddress: ", existingAddress)

        let houseId

        if (!existingAddress) {

            const newHouse = new House({
                // houseId: new mongoose.Types.ObjectId().toHexString(), // Generando un ID unico
                direccion
            })

            const house = await newHouse.save()
            console.log("Se creo una Casa nueva: ", house)
            houseId = house._id
            // if (newHouse !== resultHosue) {
            //     return res.status(424).json({
            //         message: 'El servidor no pudo persistir los datos de Casa, Intentelo Nuevamente!'
            //     })
            // } <--- Esto lo hace mongoose con el Try/Catch ya que al fallar el guardado Mongoose tira una excepcion 
        } else {
            houseId = existingAddress
        }

        const passwordHash = await bcrypt.hash(password, SALT)

        const newUser = new User({
            // userId: new mongoose.Types.ObjectId().toHexString(), // Generando un ID unico
            username,
            passwordHash,
            houseId
        })

        const user = await newUser.save()

        console.log("Se creo el usuario", user)

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' })
        res.status(201).json({ message: 'Usuario registrado con exito.', token, lastSyncTimestamp: user.lastSyncedTimestamp })
    } catch (err) {
        console.error(err)
        res.status(500).json({message: 'Error Interno en el Servidor'})
    }
})

// Ruta de Inicio de sesion
authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body

        console.log("Login de usuario: ", username, password)

        if (!username || !password) {
            return res.status(400).json({ message: 'Username y password son requeridos'})
        }

        // Tipando user con la Interfaz de IUser y Document de Mongoose
        const user: (IUser & Document) | null = await User.findOne({ username })

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Credenciales invalidas'})
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, {expiresIn: '1h' })
        res.status(200).json({token, lastSyncedTimestamp: user.lastSyncedTimestamp})
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error en el servidor'})
    }
})

export default authRouter