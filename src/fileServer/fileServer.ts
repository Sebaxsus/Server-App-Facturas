import express, { type Request, type Response } from "express"
import multer from "multer"
import { randomUUID } from "node:crypto"
import path from "node:path"
import fs from "node:fs"
import { logger } from "../utils/logger.js"

// Servicio interno de archivos: sin Mongo, sin logica de negocio, solo bytes en disco.
// Atado a 127.0.0.1 — nunca expuesto a la red, solo alcanzable desde el Express principal
// (src/routes/files.ts), que hace de reverse proxy autenticado hacia este servicio.
export const FILE_SERVER_PORT = Number(process.env.FILE_SERVER_PORT) || 4100

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true })
        cb(null, UPLOAD_DIR)
    },
    filename: (_req, _file, cb) => cb(null, randomUUID()),
})

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
            cb(new Error('Tipo de archivo no permitido'))
            return
        }
        cb(null, true)
    },
})

// El id generado por multer (filename) resuelve siempre dentro de UPLOAD_DIR (crypto.randomUUID(),
// sin caracteres de path), pero igual se valida el path resuelto como defensa en profundidad
// contra path traversal.
const resolveUploadPath = (id: string): string | null => {
    const resolved = path.join(UPLOAD_DIR, id)
    if (!resolved.startsWith(UPLOAD_DIR)) return null
    return resolved
}

export const startFileServer = (): void => {
    const fileApp = express()

    fileApp.post('/store', (req: Request, res: Response) => {
        upload.single('file')(req, res, (err: unknown) => {
            if (err) {
                logger.warn('fileServer/store', 'Fallo al recibir el archivo: ', err)
                res.status(400).json({ message: err instanceof Error ? err.message : 'Archivo invalido' })
                return
            }
            if (!req.file) {
                res.status(400).json({ message: 'No se recibio ningun archivo' })
                return
            }
            res.status(201).json({
                id: req.file.filename,
                mimetype: req.file.mimetype,
                originalName: req.file.originalname,
                size: req.file.size,
            })
        })
    })

    fileApp.get('/retrieve/:id', (req: Request, res: Response) => {
        const filePath = resolveUploadPath(req.params.id ?? '')
        if (!filePath || !fs.existsSync(filePath)) {
            res.status(404).json({ message: 'Archivo no encontrado' })
            return
        }
        fs.createReadStream(filePath).pipe(res)
    })

    fileApp.listen(FILE_SERVER_PORT, '127.0.0.1', () => {
        logger.info('fileServer', `Servicio interno de archivos escuchando en 127.0.0.1:${FILE_SERVER_PORT}`)
    })
}
