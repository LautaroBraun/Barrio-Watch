import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// Lista pública: el formulario de registro la necesita antes de tener sesión.
router.get('/', async (_req, res) => {
  const { rows } = await query(
    `select id_zona as id, nombre, descripcion
       from zonas
      where activa
      order by nombre`,
  )
  res.json({ zonas: rows })
})

export default router
