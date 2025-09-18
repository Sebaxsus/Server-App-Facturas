import { type Response, type NextFunction } from "express"
import { type AuthRequest } from "../interfaces/authInterface.js"
import jwt from "jsonwebtoken"
// Puto Node y las ENV con DotEnv,
// Porque no la detectas Node, en server si y aqui no 😿
// Inyectate bien porfa aaaaaaaaa 😡
const JWT_SECRET = process.env.JWT_SECRET || "putoDotEnv&PutoTS"

// Middleware Auth

export const authToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization']
    console.log("authHeader: ", authHeader)

    if (!authHeader) {
        return res.status(400).json({ message: "Asegurese de estar enviando el encabezado de Autorizacion"})
    }
    const token = authHeader && authHeader.split(' ')[1]

    // console.log("Token recibido en el Middle: ", token)

    if (token == null) {
        return res.status(401).json({ message: "Asegurese que se esta enviando el token"})
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({message: err})
        }
        req.user = { userId: user.userId};
        next()
    })
}