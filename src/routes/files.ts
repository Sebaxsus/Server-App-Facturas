import { Router, type Request, type Response, type NextFunction } from "express"
import { createProxyMiddleware, responseInterceptor } from "http-proxy-middleware"
import type { DocRequest } from "../interfaces/authInterface.js"
import { authToken } from "../middleware/authMiddleware.js"
import { validateDoc } from "../middleware/documentValidation.js"
import { File } from "../schemas/Mongo/File.js"
import { FILE_SERVER_PORT } from "../fileServer/fileServer.js"
import { logger } from "../utils/logger.js"

const filesRouter = Router()
const FILE_SERVER_URL = `http://127.0.0.1:${FILE_SERVER_PORT}`

// Gateway publico ("CDN"): nunca toca el disco directamente, siempre hace de reverse
// proxy autenticado hacia el servicio interno de archivos (src/fileServer).

// Sube un archivo: el proxy reescribe el path a /store en el servicio interno, y cuando
// llega la respuesta, crea la metadata en Mongo (File) antes de responder al cliente real.
filesRouter.post('/', authToken, validateDoc, createProxyMiddleware({
    target: FILE_SERVER_URL,
    changeOrigin: true,
    pathRewrite: () => '/store',
    selfHandleResponse: true,
    on: {
        proxyRes: responseInterceptor(async (buffer, proxyRes, req, res) => {
            const docReq = req as unknown as DocRequest

            if (proxyRes.statusCode !== 201) {
                res.statusCode = proxyRes.statusCode ?? 502
                return buffer
            }

            if (!docReq.user?.userId || !docReq.user?.houseId) {
                res.statusCode = 401
                return JSON.stringify({ message: 'Usuario no autenticado' })
            }

            try {
                const data = JSON.parse(buffer.toString('utf8')) as {
                    id: string, mimetype: string, originalName: string, size: number
                }
                const file = await File.create({
                    _id: data.id,
                    houseId: docReq.user.houseId,
                    ownerUserId: docReq.user.userId,
                    mimetype: data.mimetype,
                    originalName: data.originalName,
                    size: data.size,
                })
                res.statusCode = 201
                return JSON.stringify({ id: file._id, url: `/cdn/${file._id}` })
            } catch (err) {
                logger.error('files/POST', 'Fallo al guardar metadata del archivo: ', err)
                res.statusCode = 500
                return JSON.stringify({ message: 'Error en el servidor' })
            }
        }),
    },
}))

// Sirve un archivo: primero valida en Mongo que exista y pertenezca a la casa del usuario
// autenticado, y solo entonces hace de proxy hacia el servicio interno para los bytes.
filesRouter.get('/:id', authToken, validateDoc, async (req: DocRequest, res: Response, next: NextFunction) => {
    try {
        const file = await File.findById(req.params.id)

        if (!file) {
            res.status(404).json({ message: 'Archivo no encontrado' })
            return
        }

        if (file.houseId.toString() !== req.user?.houseId?.toString()) {
            res.status(403).json({ message: 'No tiene acceso a este archivo' })
            return
        }

        res.locals.mimetype = file.mimetype
        next()
    } catch (err) {
        logger.error('files/GET', 'Fallo al resolver metadata del archivo: ', err)
        res.status(500).json({ message: 'Error en el servidor' })
    }
}, createProxyMiddleware({
    target: FILE_SERVER_URL,
    changeOrigin: true,
    pathRewrite: (_path, req) => `/retrieve/${(req as Request).params.id}`,
    on: {
        proxyRes: (proxyRes, _req, res) => {
            const mimetype = (res as Response).locals.mimetype
            if (mimetype) proxyRes.headers['content-type'] = mimetype
        },
    },
}))

export { filesRouter }
export default filesRouter
