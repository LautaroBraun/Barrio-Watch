import { query } from '../db.js'

const SELECT_USUARIO = `
  select u.id_usuario, u.nombre, u.apellido, u.email, u.password_hash, u.estado,
         u.telefono, u.email_verificado,
         r.nombre as rol, z.id_zona, z.nombre as zona, z.codigo as zona_codigo
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
    telefono: fila.telefono,
    // HU06 · CA 6.4: el frontend necesita saberlo para mostrar el aviso
    // persistente y bloquear las acciones de escritura.
    emailVerificado: fila.email_verificado,
    zona: { id: fila.id_zona, codigo: fila.zona_codigo, nombre: fila.zona },
  }
}

export async function buscarPorId(idUsuario) {
  const { rows } = await query(`${SELECT_USUARIO} where u.id_usuario = $1`, [idUsuario])
  return rows[0] ?? null
}

// HU06 · CA 6.2: marca la cuenta como verificada y consume el enlace.
export async function marcarEmailVerificado(cliente, idUsuario) {
  await cliente.query('update usuarios set email_verificado = true where id_usuario = $1', [idUsuario])
}
