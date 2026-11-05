import { config } from '../config.js'
import { TIPOS, crearToken, minutosDesdeUltimoToken } from './tokens.js'

// HU06 · CA 6.1 y CA 6.5. Emite el enlace de verificación y lo manda por
// correo, salvo que se haya emitido otro hace menos de cinco minutos: en ese
// caso devuelve cuántos minutos faltan para poder reintentar, que es lo que
// la interfaz le informa al vecino.
export async function enviarEnlaceVerificacion({ usuario, correo, forzar = false }) {
  if (!forzar) {
    const minutos = await minutosDesdeUltimoToken(usuario.id_usuario, TIPOS.VERIFICACION)
    if (minutos !== null && minutos < config.minutosEntreReenvios) {
      return { enviado: false, minutosRestantes: Math.max(1, Math.ceil(config.minutosEntreReenvios - minutos)) }
    }
  }

  const token = await crearToken({
    idUsuario: usuario.id_usuario,
    tipo: TIPOS.VERIFICACION,
    minutosVigencia: config.horasVigenciaVerificacion * 60,
  })

  const enlace = `${config.frontendUrl}/verificar?token=${token}`
  // No se espera el envío: la respuesta no debe depender del servidor SMTP.
  correo
    .enviarVerificacion({ email: usuario.email, nombre: usuario.nombre, enlace })
    .catch((e) => console.error('[correo] No se pudo enviar el enlace de verificación:', e))

  return { enviado: true, minutosRestantes: 0 }
}
