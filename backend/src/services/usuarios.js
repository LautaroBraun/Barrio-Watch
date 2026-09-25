import { query } from '../db.js'

const SELECT_USUARIO = `
  select u.id_usuario, u.nombre, u.apellido, u.email, u.password_hash, u.estado,
         r.nombre as rol, z.id_zona, z.nombre as zona
    from usuarios u
    join roles r on r.id_rol = u.id_rol
    join zonas z on z.id_zona = u.id_zona`

export async function buscarPorEmail(email) {
  const { rows } = await query(`${SELECT_USUARIO} where u.email = $1`, [email])
  return rows[0] ?? null
}

export async function buscarPorSesion(idUsuario, idSesion) {
  const { rows } = await query(
    `${SELECT_USUARIO}
       join sesiones s on s.id_usuario = u.id_usuario
      where u.id_usuario = $1
        and s.id_sesion = $2
        and s.exitoso
        and s.fecha_cierre is null
        and u.estado`,
    [idUsuario, idSesion],
  )
  return rows[0] ?? null
}

// Lo que se expone al frontend: nunca el hash ni el estado interno.
export function usuarioPublico(fila) {
  return {
    id: fila.id_usuario,
    nombre: fila.nombre,
    apellido: fila.apellido,
    email: fila.email,
    rol: fila.rol,
    zona: { id: fila.id_zona, nombre: fila.zona },
  }
}
