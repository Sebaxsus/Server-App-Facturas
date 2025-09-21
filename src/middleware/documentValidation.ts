import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../interfaces/authInterface.js"
import { User } from "../schemas/Mongo/User.js"
import { House } from "../schemas/Mongo/House.js"

export const validateDoc = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId
    const houseId = req.user?.houseId
    // Como el flujo seria:
    //  Verificar que si existe el Usuario
    //  Verificar que si existe un HouseId en el Usuario

    // Primero se verifica que se halla encontrado el Usuario
    // Ya que si no sirve el Token o es Incorrecto no deberia llegar aqui
    // Verifico que desde el Middleware authToken se halla autenticado el token
    // Y se halla encontrado la id de usuario vinculada al Token
    if (!userId) {
        return res.status(401).json({
            message: "Usuario no autenticado, Inicie Sesion!"
        })
    }
     // Verifico que desde el Middleware authToken halla encontrado una houseId dentro de user
    if (!houseId) {
        // Uso el codigo de res 404 ya que el usuario no tiene una id de Casa Registrada
        return res.status(404).json({
            message: "No cuenta con una casa registrada a su usuario, Porfavor registre una!."
        })
    }
    // Como ya se sabe que si esta autenticado y tiene un houseId ligada
    // Seguimos con la verificacion de exista la casa y el usuario en la Base de Datos
    
    // Excluyo campos innecesario y Grandes en tamaño
    // Usando el metodo/Parametro de Query .select("-campo -campo")
    // Configurando de manera implicita que es de exclusion con el flag "-" antes de el campo
    // Lo que significa que va a omitor los campos especificados en .select()
    // [Mas INFO](https://mongoosejs.com/docs/api/query.html#Query.prototype.select())
    const house = await House.findById({ houseId }).select("-recibosFacturas -recibosArriendo")
    const user = await User.findById({ userId }).select("houseId lastSyncedTimestamp")

    if (!house) {
        return res.status(404).json({
            message: "La casa registrada en su usuario No se encuentra en la Base de Datos!."
        })
    }

    if (!user) {
        return res.status(404).json({
            message: "Su informacion de usuario no se encuentra en la Base de Datos!."
        })
    }

    // Inyecto los campos userData y houseData
    // A el objecto Request (req)
    // Aumenta complejidad Inutil Actualmente 😓 Perdi el tiempo :'(
    // req.userData = {
    //     userId: user.userId,
    //     houseId: user.houseId,
    //     lastSyncedTimestamp: user.lastSyncedTimestamp,
    // }

    // req.houseData = {
    //     houseId: house.houseId,
    //     direccion: house.direccion,
    //     ahorros: house.ahorros,
    //     tipoFactura: house.tipoFactura,
    //     arriendo: house.arriendo,
    //     lastSyncedTimestamp: house.lastSyncedTimestamp
    // }

    next()
}