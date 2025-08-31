import express from "express"
import { json, type Request, type Response } from "express"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { User } from "./models/Mongo/User.js"
import type { UserDataDTO, UserData } from "./interfaces/interfaces.js"

const app = express()

app.disable('x-powered-by')
app.use(json)

const JWT_SECRET = 'secret_key'

// Middleware Auth
interface AuthRequest extends Request {
    user?: { userId: string }
}

const authToken = (req: AuthRequest, res: Response, next: () => void) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401)

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403)
        req.user = { userId: user.userId};
        next()
    })
}
