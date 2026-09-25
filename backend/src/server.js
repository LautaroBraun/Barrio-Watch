import { crearApp } from './app.js'
import { config } from './config.js'

crearApp().listen(config.puerto, () => {
  console.info(`Barrio Watch API escuchando en http://localhost:${config.puerto}`)
})
