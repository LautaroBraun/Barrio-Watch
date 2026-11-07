import { waitUntil } from '@vercel/functions'

// En un servidor de toda la vida alcanza con disparar una promesa y seguir:
// el proceso queda vivo y la tarea termina sola un rato después. En una
// función serverless no. Apenas se devuelve la respuesta, la plataforma
// congela la ejecución y lo que quedó pendiente se descarta sin error y sin
// aviso: por eso el correo de recuperación se creaba en la base pero nunca
// llegaba a salir.
//
// waitUntil le pide a Vercel que mantenga viva la función hasta que la
// promesa termine, sin demorar la respuesta que ya se envió.
export function enSegundoPlano(promesa) {
  try {
    waitUntil(promesa)
  } catch {
    // Fuera de Vercel —desarrollo local y pruebas— no hay contexto de
    // petición y waitUntil falla. Ahí no hace falta: el proceso sigue
    // corriendo y la promesa se resuelve igual.
  }
  return promesa
}
