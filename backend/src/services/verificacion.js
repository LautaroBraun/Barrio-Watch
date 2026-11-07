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
  // Acá sí se espera el envío. En el alta no hay nada que ocultar —el propio
  // formulario ya avisa si el correo está registrado (CA 1.3)—, así que la
  // demora no filtra información, y esperar es la única forma de garantizar
  // que el correo salga antes de que la función serverless se congele.
  // Si el servidor SMTP falla, la cuenta queda creada igual: el vecino puede
  // pedir el reenvío desde el aviso de «Revisá tu correo».
  await correo
    .enviarVerificacion({ email: usuario.email, nombre: usuario.nombre, enlace })
    .catch((e) => console.error('[correo] No se pudo enviar el enlace de verificación:', e))

  return { enviado: true, minutosRestantes: 0 }
}
