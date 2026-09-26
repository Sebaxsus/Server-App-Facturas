import { Worker } from "node:worker_threads"
import { inspect } from "node:util"

type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

type WorkerOutMessage = { type: 'shutdown-ack' }

const LEVEL_COLORS: Record<LogLevel, string> = {
    TRACE: '\x1b[90m',
    DEBUG: '\x1b[36m',
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    CRITICAL: '\x1b[1;31m',
}
const RESET = '\x1b[0m'

// WARN/ERROR/CRITICAL siempre se ven en consola como red de seguridad,
// el resto de niveles solo se ve si se arranca con --log (npm run dev:log / start:log)
const ALWAYS_CONSOLE_LEVELS: ReadonlySet<LogLevel> = new Set(['WARN', 'ERROR', 'CRITICAL'])
const LOG_CONSOLE_MODE = process.argv.includes('--log')

const formatTimestamp = (date: Date): string => {
    const dd = String(date.getDate()).padStart(2, '0')
    const MM = String(date.getMonth() + 1).padStart(2, '0')
    const YYYY = date.getFullYear()
    const HH = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${dd}/${MM}/${YYYY}-${HH}:${mm}`
}

const formatData = (data: unknown[]): string => {
    return data
        .map(item => typeof item === 'string' ? item : inspect(item, { depth: null }))
        .join(' ')
}

// Escribe a disco en un worker_thread aparte (src/utils/loggerWorker.mjs) para que el
// hilo principal del servidor nunca se bloquee por I/O de logs. El orden de escritura
// queda garantizado por la entrega FIFO de mensajes de Node hacia el worker, sin que el
// hilo principal tenga que esperar confirmación de cada escritura.
class Logger {
    static #instanceCreated = false
    readonly #worker: Worker

    constructor() {
        if (Logger.#instanceCreated) {
            throw new Error('Logger ya tiene una instancia activa, use la instancia exportada')
        }
        Logger.#instanceCreated = true

        this.#worker = new Worker(new URL('./loggerWorker.mjs', import.meta.url))
        this.#worker.on('error', (err) => {
            console.error('Fallo el worker del logger: ', err)
        })
    }

    #write(level: LogLevel, title: string, data: unknown[]): void {
        const message = formatData(data)
        const line = `[${level}] ${formatTimestamp(new Date())} ${title} - ${message}`

        if (LOG_CONSOLE_MODE || ALWAYS_CONSOLE_LEVELS.has(level)) {
            console.log(`${LEVEL_COLORS[level]}${line}${RESET}`)
        }

        this.#worker.postMessage({ type: 'write', line })
    }

    trace(title: string, ...data: unknown[]): void {
        this.#write('TRACE', title, data)
    }

    debug(title: string, ...data: unknown[]): void {
        this.#write('DEBUG', title, data)
    }

    info(title: string, ...data: unknown[]): void {
        this.#write('INFO', title, data)
    }

    warn(title: string, ...data: unknown[]): void {
        this.#write('WARN', title, data)
    }

    error(title: string, ...data: unknown[]): void {
        this.#write('ERROR', title, data)
    }

    critical(title: string, ...data: unknown[]): void {
        this.#write('CRITICAL', title, data)
    }

    // Espera a que el worker termine de procesar (en orden) todas las escrituras
    // pendientes antes de cerrarlo — se usa en el apagado del servidor (SIGINT/SIGTERM).
    async shutdown(): Promise<void> {
        await new Promise<void>((resolve) => {
            const onMessage = (msg: WorkerOutMessage) => {
                if (msg.type === 'shutdown-ack') {
                    this.#worker.off('message', onMessage)
                    resolve()
                }
            }
            this.#worker.on('message', onMessage)
            this.#worker.postMessage({ type: 'shutdown' })
        })
        await this.#worker.terminate()
    }
}

export const logger = new Logger()
