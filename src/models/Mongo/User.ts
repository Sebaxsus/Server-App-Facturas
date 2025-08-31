import mongoose, { Document, Schema } from "mongoose";
// Como los tipos al compilar 
// En TypeScript, una interfaz, un type alias o una clase usada como tipo se eliminan cuando el código se compila a JavaScript (porque JS no tiene tipos).

// El problema es que si usas un import normal, TypeScript puede incluir ese módulo en el bundle aunque solo lo uses como tipo. Para evitarlo, existe import type.

// Al compilar, ese import type no genera ningún import en el JS final.

// import { Persona } from "./persona";
// El compilador podría generar un require("./persona") (en CommonJS) o un import "./persona" (en ESModules), aunque en realidad no lo necesites en tiempo de ejecución.
// En cambio, si hubieras escrito:

// import { Persona } from "./persona";

// n resumen:

// import type → garantiza que el import se elimina en tiempo de compilación, porque solo es un tipo.

// Si necesitas ambos, puedes mezclarlos
// import { crearPersona } from "./persona";
// import type { Persona } from "./persona";

// const juan: Persona = crearPersona("Juan", 25);

// Evita imports innecesarios en el bundle.

// Es muy útil en proyectos grandes o con bundlers (Webpack, Vite, etc.), porque reduce código muerto.
import type { UserData, MovimientoAhorro, Factura, Arriendo } from "../../interfaces/interfaces.js";