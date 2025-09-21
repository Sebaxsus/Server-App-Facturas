// Imports de Librerias/Dependencias
import { Router, type Request, type Response, type NextFunction } from "express"

// Imports Mios
import type { UserDataDTO, UserData, MovimientoAhorro, TipoFactura, Arriendo, Recibo } from "../interfaces/interfaces.js"
import type { DocRequest, SyncRequest } from "../interfaces/authInterface.js"
// Imports Modelos Mongoose
import { User } from "../schemas/Mongo/User.js"
import { House } from "../schemas/Mongo/House.js"
// Imports MiddleWares
import { authToken } from "../middleware/authMiddleware.js"
import { validateDoc } from "../middleware/documentValidation.js"

const syncRouter = Router()

// Al ser un Pull based synchronization model, Esta
// Ruta expone la ultima fecha que el server recibio una sincronización
// de un usuario, En lugar de exponer la ultima fecha de Sync de el user
// Ya que esa debe estar en local, Para sincronizar esos datos se necesita otra
// Ruta.
syncRouter.get('/last-sync', authToken, validateDoc, async (req: DocRequest, res: Response) => {
    try {
        const houseId = req.user?.houseId
        // const userId = req.user?.userId

        const house = await House.findById(houseId).select("lastSyncedTimestamp")
        console.log(`Last sync id: ${houseId}, house: ${house}`)
        // const user = await User.findById({ userId })  
        if (!house) {
        return res.status(404).json({
            message: "La casa registrada en su usuario No se encuentra en la Base de Datos!."
        })
    }
        // if (!user) {
        //     return res.status(404).json({ message: 'Usuario no encontrado.' })
        // }

        // Si por alguna razon existe el campo pero esta vacio en lugar de que salte error
        // Establesco que es null para que el cliente entienda que no hay una fecha aun. 
        const lastSyncedTimestamp = typeof house.lastSyncedTimestamp === undefined ? null : house.lastSyncedTimestamp

        console.log("Elemento Casa desde Mongo: ",house, house.lastSyncedTimestamp, typeof house.lastSyncedTimestamp, typeof house.lastSyncedTimestamp === "undefined", typeof house.lastSyncedTimestamp === undefined, lastSyncedTimestamp)

        res.status(200).json({ lastSyncedTimestamp })
    } catch (err) {
        console.error("Fallo /last-sync Error:", err)
        res.status(500).json({ message: 'Error en el servidor'})
    }
})

// syncRouter.post('/sync', authToken, async (req: AuthRequest, res: Response) => {
//     try {
//         const { Ahorros, Facturas, Arriendo, lastSyncedTimestamp } = req.body
//         const userId = req.user?.userId
//         let syncedCount = { value: 0}

//         if (!userId) {
//             return res.status(401).json({ message: 'Usuario no autenticado'})
//         }

//         const user = await User.findOne({ userId })
//     } catch (err) {
//         res.status(500).json({ message: 'Error en el Servidor' })
//     }
// })

const syncCollection = (dbCollection: any[], incomingData: any[] | undefined, syncedCount: { value: number }, propiedadUnica: String) => {
    // Propiedad unica como su nombre lo indica es la propiedad de el Sub-esquema o Documento
    // Por la cual voy a comparar si ya existe o no
    console.log(`Entro a syncCollection dbCollection: ${dbCollection} | ${dbCollection.length}, incomingData: ${incomingData} | ${incomingData?.length}, syncedCount: ${syncedCount.value}`)
    // Si no hay datos en la Peticion pues no sincronizo nada 👍
    if (!incomingData || !Array.isArray(incomingData)) {
        return dbCollection
    }

    incomingData.forEach(incomingItem => {
        // Buscando en la dbCollection (user.Ahorros/Facturas/(Arriendo.pagos) ) si ya esta guardado
        // En caso de que no este Guardado / No Exita devuelve "-1",
        // En caso de que si exista Devuelve el Indice.
        const dbItemIndex = dbCollection.findIndex(item => item[`${propiedadUnica}`] === incomingItem[`${propiedadUnica}`])
        // Si el Indice es 0 o Mayor entra, (Es decir existe un Item).
        console.log(`Item #${dbItemIndex}: ${dbItemIndex >= 0 ? dbCollection[dbItemIndex][`${propiedadUnica}`] : incomingItem[`${propiedadUnica}`]}`)
        if (dbItemIndex > -1) {
            // Obtengo la fecha de Creacion de el Item en BD y lo Parseo a un Obj Date.
            const dbTimestamp = new Date(dbCollection[dbItemIndex].timestamp)
            // Obtengo la fecha de Creacion de el Item en la Peticion y lo Parseo a un Obj Date.
            const incomingTimestamp = new Date(incomingItem.timestamp)
            // Si la fecha de el Item en la Peticion es Mayor (Mas Reciente), Sobre-escribo ese Item
            // Con los nuevos datos, Luego actualizo el contador de Items Sincronizados.
            if (incomingTimestamp > dbTimestamp) {
                dbCollection[dbItemIndex] = incomingItem
                syncedCount.value++
            }
        // En caso de que el Item en la Peticion no este en la BD 
        } else {
            // Añado el item en la Ultima posicion de el Arreglo
            dbCollection.push(incomingItem)
            // Aumento el contador de Items Sincronizados
            syncedCount.value++
        }
    })
    // Devuelvo el Arreglo con los nuevos Datos.
    return dbCollection
}

// Ruta de Sync para Ahorros
syncRouter.post("/Ahorros", authToken, validateDoc, async (req: SyncRequest<{ ahorros: MovimientoAhorro[] }>, res: Response) => {
    // Deberia agruegar un capo type dentro de la req para diferenciar entre ahorros personales y de Casa
    // console.log("Entro a Ahorros: ")
    try {
        const { ahorros, lastSyncedTimestamp } = req.body
        let syncedCount = { value: 0}
        const userId = req.user?.userId
        const houseId = req.user?.houseId

        // console.log(`Datos desesctructurados\nAhorros: ${ahorros}\nlastSyncedTimestamp: ${lastSyncedTimestamp} ${lastSyncedTimestamp === undefined} ${lastSyncedTimestamp === "undefined"}\nuserId: ${userId}\nhouseId: ${houseId}`)

        if (!ahorros) {
            return res.status(400).json({
                message: "Verifique el cuerpo de la Peticion!, Faltan propiedades/Parametros!"
            })
        }
        
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado'})
        }
       
        if (!houseId) {
            
            return res.status(404).json({ message: 'No cuenta con una casa registrada a su usuario, Porfavor registre una!'})
        }
        // Separo los dos casos para tener un mensaje mas especifico para cada problema/Error

        // Uso findById en lugar de findOne porque es mas rapido y tiene el mismo resultado
        // Lo encuentra o no 
        const user = await User.findById(userId).select("lastSyncedTimestamp")
        const house = await House.findById(houseId).select("ahorros lastSyncedTimestamp")

        // console.log(`User data Mg: ${user} | House data Mg: ${house}`)

        // Porque primero verifico la casa y no el usuario
        // Porqué el usuario se relaciona con la casa, Por ende la casa debe existir
        // Antes que el usuario, Esto es por como esta el modelo diseñado
        // Una casa a muchos usuarios

        // Cuando hago un Model.create() realmente hace new Model.create({data}).save()
        // Por eso al resolver la promesa en user se guarda el Documento que creé
        // [Mas INFO](https://mongoosejs.com/docs/api/model.html#Model.create())
        // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())
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

        // En caso de ya esten los Documentos y Colecciones creadas solo agruego lo necesario
        // Filtrando los datos existentes de los que no.
        // Agruegando los nuevos datos
        house.ahorros = syncCollection(house.ahorros, ahorros, syncedCount, "_id")
        house.lastSyncedTimestamp = new Date()  // Ultima actualizacion de datos en BD - Es decir cuando se llegue hasta aqui
        user.lastSyncedTimestamp = lastSyncedTimestamp === undefined ? null : new Date(lastSyncedTimestamp) // La fecha de el Cliente
        // Cambie la interfaz de HouseData y UserData para que reciba String|Date|Null,
        // Esto asumiendo que mongo lo parsea con el Set que tiene lastSyncedTimestamp
        // console.log(`Pre Save:\nHouse: ${house}\nUser: ${user} TimeStamp: ${lastSyncedTimestamp === undefined ? new Date() : new Date(lastSyncedTimestamp)}`)
        // Persistiendo (Guardando) los datos en Mongo
        // La promesa de un Model.save() devolvera el modelo actual
        // Es decir hago un user.save(), Para verificar que se guardó
        // Debo comparar user con user.save(): user === await user.save()
        // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())
        await house.save()
        await user.save()

        // console.log(`Result House: ${house === resultHouse} | Result User: ${user === resultUser}`)

        res.status(200).json({
            message: 'Sincronizacion de Ahorros completada',
            syncedCount: syncedCount.value,
            lastSyncedTimestamp: {
                user: user.lastSyncedTimestamp,
                house: house.lastSyncedTimestamp
            }
        })

    } catch (err) {
        console.error("Fallo /Ahorros, Error: ", err)
        res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Ruta de Sync para Guardar una nueva Factura (empresa, sitioDePago, fechaDellegada, etc...)
syncRouter.post('/Facturas', authToken, validateDoc, async (req: SyncRequest<{ tipoFactura: TipoFactura[] }>, res: Response) => {
    console.log("Entro a Facturas(Tipo):")
    try {
        const { tipoFactura, lastSyncedTimestamp } = req.body
        const syncedCount = { value: 0 }
        const userId = req.user?.userId
        const houseId = req.user?.houseId

        // TODO: Migrarlo a un Middle que verifique el cuerpo de la Peticion (Request)
        if (!tipoFactura) {
            return res.status(400).json({
                message: "Verifique el cuerpo de la Peticion!, Faltan propiedades/Parametros!"
            })
        }

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' })
        }

        if (!houseId) {
            return res.status(404).json({ message: 'No cuenta con una casa registrada a su usuario, Porfavor registre una!' })
        }

        const user = await User.findById(userId).select("lastSyncedTimestamp")
        const house = await House.findById(houseId).select("tipoFactura lastSyncedTimestamp")

        // Pregunta: Si se crea aqui, Mongo generara las colecciones vacias de tiposFacturas,recibos, etc...?
        // Respuesta: No, AL ser "Schemeless" mongo no lo necesita definidos ya que es un base de Esquema Dinamico
        //  Es decir solo crea los campos que se le pasan para guardar algo.
        //  Ahora el esquema que se define en Mongoose es para asegurarse que no se guarden campos fuera de ese esquema
        //  Y como mongo no necesita guardar el esquema Por defecto Mongoose solo guarda y crear los campos que tienen datos
        //  Y para que se genere uno toca definir un valor por defecto para un campo, Con esto Mongose y Mongo Guardaran ese campo
        //  Aunque no se le pase ningun dato ya que usaria el valor por defecto definido en el esquema.

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

        // Filtrando los datos que ya estan guardados de los que no y persistiendolos en la BD
        house.tipoFactura = syncCollection(house.tipoFactura, tipoFactura, syncedCount, "tipo")
        // Actualizando las fechas de Sync
        house.lastSyncedTimestamp = new Date() // Ultima actualizacion de datos en BD - Es decir cuando se llegue hasta aqui
        user.lastSyncedTimestamp = lastSyncedTimestamp === undefined ? null : new Date(lastSyncedTimestamp) // Se supone que mongo podria parsear el String Formato Date ISO con el setter \(シ)/
        
        // La promesa de un save devolvera el modole actual
        // Es decir hago un user.save(), Para verificar que se guardo
        // Debo comparar user con user.save(): user === await user.save()
        // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())
        const savedHouse = await house.save()
        await user.save() 

        res.status(200).json({
            message: 'Sincronización de Facturas completada',
            syncedCount: syncedCount.value,
            ids: savedHouse.tipoFactura.map((factura) => [factura.tipo, factura._id]),
            lastSyncedTimestamp: {
                user: user.lastSyncedTimestamp,
                house: house.lastSyncedTimestamp
            }
        })

    } catch (err) {
        console.error("Fallo /Facturas, Error: ", err)
        return res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Ruta para guardar los Recibos (reciboFactura y reciboArriendo)
syncRouter.post('/Recibos', authToken, validateDoc, async (req: SyncRequest<{ recibos: Recibo[], tipo: "Arriendo" | "Facturas" }>, res: Response) => {
    console.log(`Entro a recibos, Tipo: ${req.body.tipo}`)
    try {
        const { recibos, tipo, lastSyncedTimestamp } = req.body
        const houseId = req.user?.houseId
        const userId = req.user?.userId
        const syncedCount = { value: 0 }

        if (!recibos) {
            return res.status(400).json({
                message: "Verifique el cuerpo de la Peticion!, Faltan propiedades/Parametros!"
            })
        }
        
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado.' })
        }
        
        if (!houseId) {
            return res.status(404).json({ message: 'No cuenta con una Casa registrada a su usuario, Porfavor registre una!' })
        }
        
        const user = await User.findById(userId).select("lastSyncedTimestamp")
        const house = await House.findById(houseId).select(`tipoFactura recibos${tipo} lastSyncedTimestamp`)

        console.log("Casa Data: ", house, " Casa Facturas: ", house?.tipoFactura)
        
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
        
        if (!house.tipoFactura) {
            return res.status(404).json({
                message: "No hay ningun tipo de factura en la Base de Datos!."
            })
        }
        const FacturaIndex = house.tipoFactura.findIndex(factura => factura._id.toString() === recibos[0]?.tipoFacturaId)
        console.log(FacturaIndex)
        if (!house.tipoFactura[FacturaIndex]) {
            return res.status(400).json({
                message: "No se encontro ese tipo de Factura en la Base de Datos!."
            })
        }

        const TODAY = new Date() // En caso de que no halla timeStamp desde el cliente
        // El servidor como "Idicador de Verdad Absoluta" creara la fecha de Sync
        // En caso contrario se usara la fecha de el Cliente (Segundos de Diferencia)
        
        // ################## Esto me pone a pensar que como el server es el "Indicador de Verdad Absoluta"
        // El server siempre deberia ser el que crea la fecha de lastSyncTimestamp. (Esto confunde muchoo aaaaaaaaaaaa 😠)
        
        house[`recibos${tipo}`] = syncCollection(house[`recibos${tipo}`], recibos, syncedCount, "_id")
        house.tipoFactura[FacturaIndex].lastSyncedTimestamp = lastSyncedTimestamp === undefined ? TODAY : new Date(lastSyncedTimestamp)
        house.lastSyncedTimestamp = TODAY // Ultima actualizacion de datos en BD - Es decir cuando se llegue hasta aqui
        user.lastSyncedTimestamp = lastSyncedTimestamp === undefined ? null : new Date(lastSyncedTimestamp)

        await house.save()
        await user.save() 

        res.status(200).json({
            message: 'Sincronización de Información de Arreindo completada',
            syncedCount: syncedCount.value,
            lastSyncedTimestamp: {
                user: user.lastSyncedTimestamp,
                house: house.lastSyncedTimestamp
            }
        })

    } catch (err) {
        console.error("Fallo /Recibos, Error: ", err)
        return res.status(500).json({ message: 'Error en el Servidor.' })
    }
})

// Ruta para guardar o Actualizar la informacion de el Arriendo (fechaDePago, direccion, arrendatario)
syncRouter.post('/Arriendo', authToken, validateDoc, async (req: SyncRequest<{ arriendo: Arriendo }>, res: Response) => {
    try {
        const { arriendo, lastSyncedTimestamp } = req.body
        const userId = req.user?.userId
        const houseId = req.user?.houseId
        const syncedCount = { value: 0 }

        if (!arriendo) {
            return res.status(400).json({
                message: "Verifique el cuerpo de la Peticion!, Faltan propiedades/Parametros!"
            })
        }

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado'})
        }

        const user = await User.findById(userId).select("lastSyncedTimestamp")
        const house = await House.findById(houseId).select("arriendo direccion lastSyncedTimestamp")

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

        if (house.direccion.toLowerCase() !== arriendo.direccion.toLowerCase()) {
            return res.status(409).json({
                message: "Su dirección registrada no es la misma que la almacenada, Revise la direccion registrada!.",
                // realErrorCode: 409 Iba a usar un 400 pero meh // JAjaj conflicto entre Cliente - BD
            })
        }

        // user.Arriendo = user.Arriendo || {} // Aqui esta guardando en caso que no exista
        house.arriendo = arriendo
        house.lastSyncedTimestamp = new Date() // Ultima actualizacion de datos en BD - Es decir cuando se llegue hasta aqui
        user.lastSyncedTimestamp = lastSyncedTimestamp === undefined ? null : new Date(lastSyncedTimestamp)
        
        await house.save()
        await user.save()

        res.status(200).json({
            message: 'Sincronización de Información de Arreindo completada',
            syncedCount: null,
            id: house.arriendo._id,
            lastSyncedTimestamp: {
                user: user.lastSyncedTimestamp,
                house: house.lastSyncedTimestamp
            }
        })
    
    } catch (err) {
        console.error("Fallo /Arriendo, Error: ", err)
        return res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Export Nombrado
export { syncRouter }

export default syncRouter