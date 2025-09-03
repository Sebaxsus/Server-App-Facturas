import express from "express"
import { json, type Request, type Response } from "express"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { User } from "./models/Mongo/User.js"
import type { UserDataDTO, UserData } from "./interfaces/interfaces.js"

const app = express()
const PORT = process.env.PORT || 3000

app.disable('x-powered-by')
app.use(json)

// Driver a MongoDB
mongoose.connect('mongodb://localhost/appCuentas')
    .then(() => {
        console.log('Conectado a MongoDB')
    }).catch(err => {
        console.log('Error al conectarse con MongoDB, Error:', err)
    })
