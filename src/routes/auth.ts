import { Router, type Request, type Response } from "express"
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import { User, type IUser } from "../schemas/Mongo/User.js"
import mongoose, { type Document } from "mongoose"

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

        if (!username || !password) {
            return res.status(400).json({ message: 'Username y password son requeridos' })
        }

        const existingUser = await User.findOne({ username })
        if (existingUser) {
            return res.status(409).json({ message: 'El usuario ya existe' })
        }

        const passwordHash = await bcrypt.hash(password, SALT)

        const newUser = new User({
            userId: new mongoose.Types.ObjectId().toHexString(), // Generando un ID unico
            username,
            passwordHash,
        })

        await newUser.save()

        console.log("Se creo el usuario", newUser)

        const token = jwt.sign({ userId: newUser.userId }, JWT_SECRET, { expiresIn: '1h' })
        res.status(201).json({ message: 'Usuario registrado con exito.', token})
    } catch (err) {
        console.error(err)
        res.status(500).json({message: 'Error Interno en el Servidor'})
    }
})

// Ruta de Inicio de sesion
authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body
        if (!username || !password) {
            return res.status(400).json({ message: 'Username y password son requeridos'})
        }

        // Tipando user con la Interfaz de IUser y Document de Mongoose
        const user: (IUser & Document) | null = await User.findOne({ username })

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Credenciales invalidas'})
        }

        const token = jwt.sign({ userId: user.userId }, JWT_SECRET, {expiresIn: '1h' })
        res.status(200).json({token})
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error en el servidor'})
    }
})

export default authRouter