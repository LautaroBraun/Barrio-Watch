import nodemailer from 'nodemailer'
import { config } from '../config.js'

const escaparHtml = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Maqueta común de los correos: tarjeta blanca sobre papel y un botón.
function plantilla({ nombre, intro, boton, enlace, pie }) {
  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f6f1e7;font-family:Arial,Helvetica,sans-serif;color:#1b1a2e">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px">
          <tr><td style="font-size:20px;font-weight:bold;padding-bottom:16px">Barrio Watch</td></tr>
          <tr><td style="font-size:16px;line-height:1.5;padding-bottom:24px">
            Hola ${escaparHtml(nombre)}:<br><br>${intro}
          </td></tr>
          <tr><td align="center" style="padding-bottom:24px">
            <a href="${escaparHtml(enlace)}" style="display:inline-block;background:#1b1a2e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">
              ${escaparHtml(boton)}
            </a>
          </td></tr>
          <tr><td style="font-size:13px;line-height:1.5;color:#5c5a70">${pie}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
  return html
}

// HU06 · CA 6.1: enlace de verificación del correo, con vigencia de 24 horas.
function plantillaVerificacion({ nombre, enlace, horas }) {
  const texto = `Hola ${nombre}:

Gracias por sumarte a Barrio Watch. Para confirmar que este correo es tuyo,
entrá a este enlace (vale por ${horas} horas y se puede usar una sola vez):

${enlace}

Hasta que lo confirmes vas a poder mirar lo que pasa en tu zona, pero no
publicar ni reportar.

— Barrio Watch`

  const html = plantilla({
    nombre,
    intro: `Gracias por sumarte al barrio. Para confirmar que este correo es tuyo, tocá el botón de abajo.
            El enlace vale por <strong>${horas} horas</strong> y se puede usar una sola vez.`,
    boton: 'Confirmar mi correo',
    enlace,
    pie: 'Hasta que lo confirmes vas a poder mirar lo que pasa en tu zona, pero no publicar ni reportar.',
  })

  return { texto, html }
}

function plantillaRecuperacion({ nombre, enlace, minutos }) {
  const texto = `Hola ${nombre}:

Recibimos un pedido para restablecer la contraseña de tu cuenta de Barrio Watch.
Entrá a este enlace para elegir una nueva (vale por ${minutos} minutos y se puede usar una sola vez):

${enlace}

Si no fuiste vos, ignorá este correo: tu contraseña actual sigue funcionando.

— Barrio Watch`

  const html = plantilla({
    nombre,
    intro: `Recibimos un pedido para restablecer la contraseña de tu cuenta.
            El enlace vale por <strong>${minutos} minutos</strong> y se puede usar una sola vez.`,
    boton: 'Elegir una nueva contraseña',
    enlace,
    pie: 'Si no fuiste vos, ignorá este correo: tu contraseña actual sigue funcionando.',
  })

  return { texto, html }
}

// Sin SMTP configurado (desarrollo local) el enlace se imprime en la consola
// del backend para poder probar el circuito completo sin mandar correos.
export function crearServicioCorreo() {
  const transporte = config.smtp.host
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      })
    : null

  return {
    async enviarRecuperacion({ email, nombre, enlace }) {
      const { texto, html } = plantillaRecuperacion({ nombre, enlace, minutos: config.minutosVigenciaEnlace })
      if (!transporte) {
        console.info(`\n[correo] Enlace de recuperación para ${email}:\n${enlace}\n`)
        return
      }
      await transporte.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Restablecé tu contraseña de Barrio Watch',
        text: texto,
        html,
      })
    },

    async enviarVerificacion({ email, nombre, enlace }) {
      const { texto, html } = plantillaVerificacion({ nombre, enlace, horas: config.horasVigenciaVerificacion })
      if (!transporte) {
        console.info(`\n[correo] Enlace de verificación para ${email}:\n${enlace}\n`)
        return
      }
      await transporte.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Confirmá tu correo de Barrio Watch',
        text: texto,
        html,
      })
    },
  }
}
