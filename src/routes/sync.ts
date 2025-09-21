// Imports de Librerias/Dependencias
import { Router, type Request, type Response, type NextFunction } from "express"

// Imports Mios
import type { UserDataDTO, UserData, MovimientoAhorro, TipoFactura, Arriendo, Recibo } from "../interfaces/interfaces.js"
import type { AuthRequest, SyncRequest } from "../interfaces/authInterface.js"
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
syncRouter.get('/last-sync', authToken, validateDoc, async (req: AuthRequest, res: Response) => {
    try {
        const houseId = req.user?.houseId
        // const userId = req.user?.userId

        const house = await House.findById({ houseId })
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
        const lastSyncedTimestamp = typeof house.lastSyncedTimestamp === "undefined" ? null : house.lastSyncedTimestamp

        console.log(house.lastSyncedTimestamp, typeof house.lastSyncedTimestamp, typeof house.lastSyncedTimestamp === "undefined", typeof house.lastSyncedTimestamp === undefined, lastSyncedTimestamp)

        res.status(200).json({ lastSyncedTimestamp })
    } catch (err) {
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

const syncCollection = (dbCollection: any[], incomingData: any[] | undefined, syncedCount: { value: number }) => {
    console.log(`Entro a syncCollection dbCollection: ${dbCollection} | ${dbCollection.length}, incomingData: ${incomingData}, syncedCount: ${syncedCount}`)
    // Si no hay datos en la Peticion pues no sincronizo nada 👍
    if (!incomingData || !Array.isArray(incomingData)) {
        return dbCollection
    }

    incomingData.forEach(incomingItem => {
        // Buscando en la dbCollection (user.Ahorros/Facturas/(Arriendo.pagos) ) si ya esta guardado
        // En caso de que no este Guardado / No Exita devuelve "-1",
        // En caso de que si exista Devuelve el Indice.
        const dbItemIndex = dbCollection.findIndex(item => item._id === incomingItem._id)
        // Si el Indice es 0 o Mayor entra, (Es decir existe un Item).
        console.log(`Item #${dbItemIndex}: ${dbItemIndex >= 0 ? dbCollection[dbItemIndex]._id : incomingItem}`)
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
syncRouter.post("/Ahorros", authToken, async (req: SyncRequest<{ ahorros: MovimientoAhorro[] }>, res: Response) => {
    // Deberia agruegar un capo type dentro de la req para diferenciar entre ahorros personales y de Casa
    console.log("Entro a Ahorros: ")
    try {
        const { ahorros, lastSyncedTimestamp } = req.body
        let syncedCount = { value: 0}
        const userId = req.user?.userId
        const houseId = req.user?.houseId

        console.log(`Datos desesctructurados\nAhorros: ${ahorros}\nlastSyncedTimestamp: ${lastSyncedTimestamp}\nuserId: ${userId}\nhouseId: ${houseId}`)

        
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado'})
        }
       
        if (!houseId) {
            
            return res.status(404).json({ message: 'No cuenta con una casa registrada a su usuario, Porfavor registre una!'})
        }
        // Separo los dos casos para tener un mensaje mas especifico para cada problema/Error

        // Uso findById en lugar de findOne porque es mas rapido y tiene el mismo resultado
        // Lo encuentra o no 
        const user = await User.findById({ userId })
        const house = await House.findById({ houseId })

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
        const syncCollResult = syncCollection(house.ahorros, ahorros, syncedCount)
        console.log("SyncCollecResult: ", syncCollResult)
        // Agruegando los nuevos datos
        house.ahorros = syncCollResult
        house.lastSyncedTimestamp = new Date(lastSyncedTimestamp) 
        user.lastSyncedTimestamp = new Date(lastSyncedTimestamp)
        // Cambie la interfaz de HouseData y UserData para que reciba String|Date|Null,
        // Esto asumiendo que mongo lo parsea con el Set que tiene lastSyncedTimestamp

        // Persistiendo (Guardando) los datos en Mongo
        // La promesa de un Model.save() devolvera el modelo actual
        // Es decir hago un user.save(), Para verificar que se guardó
        // Debo comparar user con user.save(): user === await user.save()
        // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())
        const resultHouse = await house.save()
        const resultUser = await user.save()

        console.log(`Result House: ${house === resultHouse} | Result User: ${user === resultUser}`)

        res.status(200).json({ message: 'Sincronizacion de Ahorros completada', syncedCount: syncedCount.value })

    } catch (err ) {
        res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Ruta de Sync para Guardar una nueva Factura (empresa, sitioDePago, fechaDellegada, etc...)
syncRouter.post('/Facturas', authToken, async (req: SyncRequest<{ tipoFactura: TipoFactura[] }>, res: Response) => {
    console.log("Entro a Facturas(Tipo):")
    try {
        const { tipoFactura, lastSyncedTimestamp } = req.body
        const syncedCount = { value: 0 }
        const userId = req.user?.userId
        const houseId = req.user?.houseId

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' })
        }

        if (!houseId) {
            return res.status(404).json({ message: 'No cuenta con una casa registrada a su usuario, Porfavor registre una!' })
        }

        const user = await User.findById({ userId })
        const house = await House.findById({ houseId })

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
        house.tipoFactura = syncCollection(house.tipoFactura, tipoFactura, syncedCount)
        // Actualizando las fechas de Sync
        user.lastSyncedTimestamp = new Date(lastSyncedTimestamp) // Se supone que mongo podria parsear el String Formato Date ISO con el setter \(シ)/
        house.lastSyncedTimestamp = new Date(lastSyncedTimestamp)
        
        // La promesa de un save devolvera el modole actual
        // Es decir hago un user.save(), Para verificar que se guardo
        // Debo comparar user con user.save(): user === await user.save()
        // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())
        const resultHouse = await house.save()
        const resultUser = await user.save() 

        console.log(`Result House: ${house === resultHouse} | Result User: ${user === resultUser}`)
        res.status(200).json({ message: 'Sincronización de Facturas completada', syncedCount: syncedCount.value })

    } catch (err) {
        return res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Ruta para guardar los Recibos (reciboFactura y reciboArriendo)
syncRouter.post('Recibos', authToken, async (req: SyncRequest<{ recibos: Recibo[], tipo: "Arriendo" | "Facturas" }>, res: Response) => {
    console.log(`Entro a recibos, Tipo: ${req.body.tipo}`)
    try {
        const { recibos, tipo, lastSyncedTimestamp } = req.body
        const houseId = req.user?.houseId
        const userId = req.user?.userId
        const syncedCount = { value: 0 }
        
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado.' })
        }
        
        if (!houseId) {
            return res.status(404).json({ message: 'No cuenta con una Casa registrada a su usuario, Porfavor registre una!' })
        }
        
        const user = await User.findById({ userId })
        const house = await House.findById({ houseId })
        
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

        const FacturaIndex = house.tipoFactura.findIndex(factura => factura._id === recibos[0]?.tipoFacturaId )

        if (!house.tipoFactura[FacturaIndex]) {
            return res.status(400).json({
                message: "No se encontro ese tipo de Factura en la Base de Datos!."
            })
        }
        
        house[`recibos${tipo}`] = syncCollection(house[`recibos${tipo}`], recibos, syncedCount)
        house.tipoFactura[FacturaIndex].lastSyncedTimestamp = new Date(lastSyncedTimestamp)
        user.lastSyncedTimestamp = new Date(lastSyncedTimestamp)

        const resultHouse = await house.save()
        const resultuser = await user.save() 
        console.log("Mongo Save Result House: ", house === resultHouse, " Result User: ", user === resultuser)

        res.status(200).json({ message: 'Sincronización de Información de Arreindo completada', syncedCount: syncedCount.value === 0 ? syncedCount.value + 3 : syncedCount })

    } catch (err) {
        return res.status(500).json({ message: 'Error en el Servidor.' })
    }
})

// Ruta para guardar o Actualizar la informacion de el Arriendo (fechaDePago, direccion, arrendatario)
syncRouter.post('/Arriendo', authToken, async (req: SyncRequest<{ arriendo: Arriendo }>, res: Response) => {
    try {
        const { arriendo, lastSyncedTimestamp } = req.body
        const userId = req.user?.userId
        const houseId = req.user?.houseId
        const syncedCount = { value: 0 }

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado'})
        }

        let user = await User.findById({ userId })
        let house = await House.findById({ houseId })

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

        // user.Arriendo = user.Arriendo || {} // Aqui esta guardando en caso que no exista
        house.arriendo = arriendo
        user.lastSyncedTimestamp = new Date(lastSyncedTimestamp)
        
        const resultHouse = await house.save()
        const resultuser = await user.save() 
        console.log("Mongo Save Result House: ", house === resultHouse, " Result User: ", user === resultuser)

        res.status(200).json({ message: 'Sincronización de Información de Arreindo completada', syncedCount: syncedCount.value === 0 ? syncedCount.value + 3 : syncedCount })
    
    } catch (err) {
        return res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Export Nombrado
export { syncRouter }

export default syncRouter