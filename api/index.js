// Punto de entrada para Vercel: la API de Express corre como función serverless.
// vercel.json redirige todas las rutas /api/* hacia acá.
import { crearApp } from '../backend/src/app.js'

export default crearApp()
