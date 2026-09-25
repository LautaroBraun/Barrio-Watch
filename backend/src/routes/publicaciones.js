import { Router } from 'express'
import { query } from '../db.js'
import { requiereSesion } from '../middleware/autenticacion.js'

const router = Router()

// CA 3.1: la pantalla principal muestra las publicaciones de la zona del vecino.
router.get('/', requiereSesion, async (req, res) => {
  const { rows } = await query(
    `select p.id_publicacion as id, p.titulo, p.descripcion, p.ubicacion, p.fecha,
            c.nombre as categoria,
            u.nombre as autor_nombre, u.apellido as autor_apellido,
            a.nivel_urgencia, a.verificada
       from publicaciones p
       join categorias c on c.id_categoria = p.id_categoria
       join usuarios u on u.id_usuario = p.id_usuario
       left join alertas a on a.id_publicacion = p.id_publicacion
      where p.id_zona = $1
        and p.estado = 'publicada'
      order by p.fecha desc
      limit 50`,
    [req.usuario.zona.id],
  )

  res.json({
    publicaciones: rows.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion,
      ubicacion: p.ubicacion,
      fecha: p.fecha,
      categoria: p.categoria,
      autor: `${p.autor_nombre} ${p.autor_apellido}`,
      alerta: p.nivel_urgencia ? { nivel: p.nivel_urgencia, verificada: p.verificada } : null,
    })),
  })
})

export default router
