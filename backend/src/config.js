import { readFileSync } from 'node:fs'

function requerida(nombre) {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Revisá backend/.env.example`)
  return valor
}

function configSsl() {
  if (process.env.DATABASE_CA_CERT) {
    return { ca: readFileSync(process.env.DATABASE_CA_CERT, 'utf8') }
  }
  // Supabase firma sus certificados con una CA propia. Sin el certificado
  // (DATABASE_CA_CERT) la conexión viaja cifrada pero sin verificar el
  // servidor; para producción descarguen el certificado desde Supabase.
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false }
  return false
}

// Express espera un número de saltos (1), true/false o una lista de IPs.
function leerTrustProxy(valor) {
  if (!valor || valor === 'false') return false
  if (valor === 'true') return true
  if (/^\d+$/.test(valor)) return Number(valor)
  return valor
}

export const config = {
  puerto: Number(process.env.PORT ?? 3000),
  databaseUrl: requerida('DATABASE_URL'),
  databaseSsl: configSsl(),
  jwtSecret: requerida('JWT_SECRET'),
  // HU03: la sesión dura como máximo 12 horas desde el inicio de sesión.
  duracionSesionHoras: 12,
  // HU04: 5 intentos fallidos consecutivos bloquean la cuenta 15 minutos.
  intentosMaximos: 5,
  minutosBloqueo: 15,
  // HU05: el enlace de recuperación vale 1 hora y es de un solo uso.
  minutosVigenciaEnlace: 60,
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  trustProxy: leerTrustProxy(process.env.TRUST_PROXY),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? 'Barrio Watch <no-responder@barriowatch.com>',
  },
  entorno: process.env.NODE_ENV ?? 'development',
}
