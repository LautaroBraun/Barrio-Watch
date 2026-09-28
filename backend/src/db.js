import pg from 'pg'
import { config } from './config.js'

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl,
  // En Vercel cada instancia de la función abre pocas conexiones.
  max: process.env.VERCEL ? 2 : 10,
})

export function query(texto, parametros) {
  return pool.query(texto, parametros)
}

// Ejecuta fn dentro de una transacción; si algo falla se revierte todo.
export async function transaccion(fn) {
  const cliente = await pool.connect()
  try {
    await cliente.query('begin')
    const resultado = await fn(cliente)
    await cliente.query('commit')
    return resultado
  } catch (error) {
    await cliente.query('rollback')
    throw error
  } finally {
    cliente.release()
  }
}
