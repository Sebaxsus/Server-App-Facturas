import { type Response, type NextFunction } from "express"
import { type AuthRequest } from "../interfaces/authInterface.js"
import jwt from "jsonwebtoken"
import { logger } from "../utils/logger.js"
// Puto Node y las ENV con DotEnv,
// Porque no la detectas Node, en server si y aqui no 😿
// Inyectate bien porfa aaaaaaaaa 😡
const JWT_SECRET = process.env.JWT_SECRET || "putoDotEnv&PutoTS"

// Middleware Auth

export const authToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization']
    logger.debug("authToken", "authHeader: ", authHeader)

    if (!authHeader) {
        return res.status(400).json({ message: "Asegurese de estar enviando el encabezado de Autorizacion"})
    }
    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer') {
        return res.status(401).json({ message: "Esquema de autorizacion invalido, se esperaba 'Bearer'" })
    }

    logger.debug("authToken", "Token recibido en el Middle: ", token)

    if (token == null) {
        return res.status(401).json({ message: "Asegurese que se esta enviando el token"})
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            logger.warn("authToken", "Fallo la verificacion del token: ", err)
            return res.status(498).json({ message: "Token invalido o expirado" })
        }
        if (user.type === 'refresh') {
            return res.status(401).json({ message: "Token de acceso invalido, use el access token" })
        }
        req.user = {
            userId: user.userId,
        };
        next()
    })
}