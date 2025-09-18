// Imports de Librerias/Dependencias
import { Router, type Request, type Response, type NextFunction } from "express"

// Imports Mios
import { User } from "../models/Mongo/User.js"
import type { UserDataDTO, UserData, MovimientoAhorro, Factura, Arriendo } from "../interfaces/interfaces.js"
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
    if (!incomingData || !Array.isArray(incomingData)) {
        return dbCollection
    }

    incomingData.forEach(incomingItem => {
        const dbItemIndex = dbCollection.findIndex(item => item._id === incomingItem._id)
        if (dbItemIndex > -1) {
            const dbTimestamp = new Date(dbCollection[dbItemIndex].timestamp)
            const incomingTimestamp = new Date(incomingItem.timestamp)
            if (incomingTimestamp > dbTimestamp) {
                dbCollection[dbItemIndex] = incomingItem
                syncedCount.value++
            }
        } else {
            dbCollection.push(incomingItem)
            syncedCount.value++
        }
    })

    return dbCollection
}

// Ruta de Sync para Ahorros
syncRouter.post("/Ahorros", authToken, async (req: SyncRequest<{ Ahorros: MovimientoAhorro[] }>, res: Response) => {
    try {
        const { Ahorros, lastSyncedTimestamp } = req.body
        let syncedCount = { value: 0}
        const userId = req.user?.userId

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado'})
        }

        const user = await User.findOne({ userId })
        if (!user) {
            await User.create({ userId, Ahorros, lastSyncedTimestamp })
            syncedCount.value = Ahorros.length
            return res.status(201).json({ message: "Suncronización incial de Ahorros completada", syncedCount: syncedCount.value })
        }

        user.Ahorros = syncCollection(user.Ahorros, Ahorros, syncedCount)
        user.lastSyncedTimestamp = new Date(lastSyncedTimestamp)
        await user.save()

        res.status(200).json({ message: 'Sincronizacion de Ahorros completada', syncedCount: syncedCount.value })
    } catch (err ) {
        res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Ruta de Sync para Facturas
syncRouter.post('/Facturas', authToken, async (req: SyncRequest<{ Facturas: Factura[] }>, res: Response) => {
    try {
        const { Facturas, lastSyncedTimestamp } = req.body
        const syncedCount = { value: 0 }
        const userId = req.user?.userId

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' })
        }

        const user = await User.findOne({ userId })
        if (!user) {
            await User.create({ userId, Facturas, lastSyncedTimestamp })
            syncedCount.value = Facturas.length
            return res.status(201).json({ message: 'Sincronización inicial de Facturas completada', syncedCount: syncedCount.value })
        }

        user.Facturas = syncCollection(user.Facturas, Facturas, syncedCount)
        user.lastSyncedTimestamp = new Date(lastSyncedTimestamp)
        await user.save()

        res.status(200).json({ message: 'Sincronización de Facturas completada', syncedCount: syncedCount.value })
    } catch (err) {
        return res.status(500).json({ message: 'Error en el Servidor' })
    }
})

syncRouter.post('/Arriendo', authToken, async (req: SyncRequest<{ Arriendo: Arriendo }>, res: Response) => {
    try {
    const { Arriendo, lastSyncedTimestamp } = req.body
    const syncedCount = { value: 0}
    const userId = req.user?.userId

    if (!userId) {
        return res.status(401).json({ message: 'Usuario no autenticado'})
    }

    const user = await User.findOne({ userId })
    if (!user) {
        await User.create({ userId, Arriendo, lastSyncedTimestamp })
        syncedCount.value = Arriendo.pagos?.length
        return res.status(201).json({ message: 'Sincronización inicial de Arriendo completada', syncedCount: syncedCount.value })
    }
    user.Arriendo = user.Arriendo || {} // Aqui esta guardando en caso que no exista
    user.Arriendo.pagos = syncCollection(user.Arriendo.pagos || [], Arriendo.pagos, syncedCount)
    user.Arriendo.fechaDePago = Arriendo.fechaDePago
    user.Arriendo.direccion = Arriendo.direccion
    user.Arriendo.arrendatario = Arriendo.arrendatario
    user.lastSyncedTimestamp = new Date(lastSyncedTimestamp)
    await user.save()

    res.status(200).json({ message: 'Sincronización de Arreindo completada', syncedCount: syncedCount.value })
    } catch (err) {
        return res.status(500).json({ message: 'Error en el Servidor' })
    }
})

// Export Nombrado
export { syncRouter }

export default syncRouter