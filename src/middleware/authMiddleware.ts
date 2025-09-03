import { type Response, type NextFunction } from "express"
import { type AuthRequest } from "../interfaces/authInterface.js"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || ''

// Middleware Auth

export const authToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) {
        return res.sendStatus(401)
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(403)
        }
        req.user = { userId: user.userId};
        next()
    })
}