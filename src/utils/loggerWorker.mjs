// Worker plano en JS (no TS) para evitar depender del loader ESM de ts-node
// dentro de un worker_thread — ver Doc/TODO.md, revisión 2026-09-25.
import { parentPort } from 'node:worker_threads'
import fs from 'node:fs'
import path from 'node:path'

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')
const OLD_LOG_FILE = path.join(LOG_DIR, 'app.log.old')

fs.mkdirSync(LOG_DIR, { recursive: true })

// Rotación al arrancar: la corrida anterior pasa a .old (se sobrescribe si ya existía)
if (fs.existsSync(LOG_FILE)) {
    fs.renameSync(LOG_FILE, OLD_LOG_FILE)
}

fs.writeFileSync(LOG_FILE, '')

parentPort?.on('message', (msg) => {
    if (msg?.type === 'write') {
        try {
            fs.appendFileSync(LOG_FILE, msg.line + '\n')
        } catch (err) {
            console.error('Fallo al escribir el log a disco: ', err)
        }
    } else if (msg?.type === 'shutdown') {
        parentPort?.postMessage({ type: 'shutdown-ack' })
    }
})
