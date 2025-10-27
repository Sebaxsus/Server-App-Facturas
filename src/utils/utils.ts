import os from 'node:os';

export const getLocalIPAddress = (): string | null => {
    const networkInterfaces = os.networkInterfaces();
    let localIP: string | null = null

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName]
        if (interfaces) {
            for (const iface of interfaces) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIP = iface.address
                    break // Salir del bucle (Interfaz, IPV4 o IPV6, iface) una vez que se encuentra la IP
                }
            }
            if (localIP) {
                break // Salir del bucle externo (Interfaces) si ya se encontró la IP
            }
        }
    }
    console.log(`Local IP Address: ${localIP}`);
    return localIP // Retorna la IP Local o null si no se encontro
}