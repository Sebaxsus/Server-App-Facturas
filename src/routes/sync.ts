// Imports de Librerias/Dependencias
import { Router, type Request, type Response, type NextFunction } from "express"

// Imports Mios
import { User } from "../schemas/Mongo/User.js"
import { House } from "../schemas/Mongo/House.js"
import type { UserDataDTO, UserData, MovimientoAhorro, TipoFactura, Arriendo, Recibo } from "../interfaces/interfaces.js"
import { authToken } from "../middleware/authMiddleware.js"
import type { AuthRequest, SyncRequest } from "../interfaces/authInterface.js"

const syncRouter = Router()

syncRouter.get('/last-timestamp', authToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId
        const user = await User.findOne({ userId })

        if (!user) {
            return res.status(404).json({message: 'Usuario no encontrado.'})
        }
        // console.log(user.lastSyncedTimestamp, typeof user.lastSyncedTimestamp, typeof user.lastSyncedTimestamp === "undefined", typeof user.lastSyncedTimestamp === undefined)
        // if (typeof user.lastSyncedTimestamp === "undefined")
        res.status(200).json({ lastSyncedTimestamp: typeof user.lastSyncedTimestamp === "undefined" ? null : user.lastSyncedTimestamp})
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

        // Primero se verifica que se halla encontrado el Usuario, Luego que tenga una casa Vinculada
        // Esto deberia ser parte de el Middleware, 
        // Ya que si no sirve el Token o es Incorrecto no deberia llegar aqui
        // Verifico que desde el Middleware authToken se halla autenticado el token
        // Y se halla encontrado la id de usuario vinculada al Token
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado'})
        }
        // Verifico que desde el Middleware authToken halla encontrado una houseId dentro de user
        if (!houseId) {
            // Uso el codigo de res 404 ya que el usuario no tiene una id de Casa Registrada
            return res.status(404).json({ message: 'No cuenta con una casa registrada a su usuario, Porfavor registre una!'})
        }
        // Separo los dos casos para tener un mensaje mas especifico para cada problema/Error

        // Uso findById en lugar de findOne porque es mas rapido y tiene el mismo resultado
        // Lo encuentra o no 
        let user = await User.findById({ userId })
        let house = await House.findById({ houseId })

        // Porque primero verifico la casa y no el usuario
        // Porqué el usuario se relaciona con la casa, Por ende la casa debe existir
        // Antes que el usuario, Esto es por como esta el modelo diseñado
        // Una casa a muchos usuarios

        // Verificando que exista el Documento de house
        if (!house && !user) {
            // Si no existe lo creo con solo el campo de ahorros
            // Al final mongo es flexible y ya tiene un esquema definido
            house = await House.create({
                houseId,
                ahorros, //Como se esta creando se guarda los datos de la req | El esquema se encarga de filtrar los campos necesarios de los que no
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })

            user = await User.create({
                userId,
                houseId,
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })

            // Cuando hago un Model.create() realmente hace new Model.create({data}).save()
            // Por eso al resolver la promesa en user se guarda el Documento que creé
            // [Mas INFO](https://mongoosejs.com/docs/api/model.html#Model.create())
            // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())

            syncedCount.value = ahorros.length + 5 // Los 5 elementos son id's y syncedTimestamp
            // return res.status(201).json({ message: "Sincronización incial de Ahorros Casa y Usuario Completada!", syncedCount: syncedCount.value })
        }
        
        if (!house) {
            // Si no existe lo creo con solo el campo de ahorros
            // Al final mongo es flexible y ya tiene un esquema definido
            house = await House.create({
                houseId,
                ahorros, //Como se esta creando se guarda los datos de la req | El esquema se encarga de filtrar los campos necesarios de los que no
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })

            syncedCount.value = ahorros.length + 3 // Los 3 elementos son la id y syncedTimestamp
            // return res.status(201).json({ message: "Sincronización incial de Ahorros Casa Completada!", syncedCount: syncedCount.value })
        } 
        
        if (!user) {
            user = await User.create({
                userId,
                houseId,
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })
            // syncedCount.value = Ahorros.length
            // return res.status(201).json({ message: "Sincronización incial de Ahorros completada", syncedCount: syncedCount.value })
            syncedCount.value = 3
            // Establesco que se sincronizaron 3 cosas que son userId, houseId y lastSyncedTimestamp
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

        let user = await User.findById({ userId })
        let house = await House.findById({ houseId })

        if (!house && !user) {
            house = await House.create({
                houseId,
                tipoFactura, //Como se esta creando se guarda los datos de la req | El esquema se encarga de filtrar los campos necesarios de los que no
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })
            // Pregunta: Si se crea aqui, Mongo generara las colecciones vacias de tiposFacturas,recibos, etc...?
            user = await User.create({
                userId,
                houseId,
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })

            // Cuando hago un Model.create() realmente hace new Model.create({data}).save()
            // Por eso al resolver la promesa en user se guarda el Documento que creé
            // [Mas INFO](https://mongoosejs.com/docs/api/model.html#Model.create())
            // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())

            syncedCount.value = tipoFactura.length + 5 // Los 5 elementos son id's y syncedTimestamp
        }

        if (!house) {
            house = await House.create({
                houseId,
                tipoFactura,
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })
            syncedCount.value = tipoFactura.length + 2 // Los 2 elementos son la id y syncedTimestamp
        }
        //
        if (!user) {
            user = await User.create({
                userId,
                houseId,
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })
            // syncedCount.value = Ahorros.length
            // return res.status(201).json({ message: "Sincronización incial de Ahorros completada", syncedCount: syncedCount.value })
            // return res.status(201).json({ message: "Sincronización inicial de el Usuario y datos Completada", syncedCount: 3 }) 
            syncedCount.value = 3
            // Establesco que se sincronizaron 3 cosas que son userId, houseId y lastSyncedTimestamp
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

        if (!house && !user) {
            house = await House.create({
                houseId,
                arriendo, //Como se esta creando se guarda los datos de la req | El esquema se encarga de filtrar los campos necesarios de los que no
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })

            user = await User.create({
                userId,
                houseId,
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })
            // Cuando hago un Model.create() realmente hace new Model.create({data}).save()
            // Por eso al resolver la promesa en user se guarda el Documento que creé
            // [Mas INFO](https://mongoosejs.com/docs/api/model.html#Model.create())
            // [Mas INFO Save()](https://mongoosejs.com/docs/api/model.html#Model.prototype.save())
            syncedCount.value = 8
        }

        if (!house) {
            house = await House.create({
                houseId,
                arriendo,
                lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp
            })
            syncedCount.value = 5
        }
        //
        if (!user) {
            user = await User.create({ userId, houseId, lastSyncedTimestamp: typeof lastSyncedTimestamp === "undefined" ? null : lastSyncedTimestamp })
            // syncedCount.value = Ahorros.length
            // return res.status(201).json({ message: "Sincronización incial de Ahorros completada", syncedCount: syncedCount.value })
            syncedCount.value = 3
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