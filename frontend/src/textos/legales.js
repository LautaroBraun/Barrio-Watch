import { VERSION_TERMINOS } from '@barrio-watch/shared'

// HU07 · Subtarea 7.1. Los textos viven acá y no en la base: lo que se
// persiste al crear la cuenta es la fecha y la versión aceptada
// (VERSION_TERMINOS, compartida con el backend), de modo que una redacción
// nueva implica subir esa versión y no reescribir lo que alguien ya aceptó.
export const VERSION = VERSION_TERMINOS

export const TERMINOS = {
  titulo: 'Términos de uso',
  resumen: `Versión ${VERSION} · Barrio Watch`,
  secciones: [
    {
      titulo: '1. Qué es Barrio Watch',
      parrafos: [
        'Barrio Watch es una plataforma vecinal de alcance hiperlocal. Permite publicar novedades, pedir y ofrecer ayuda y reportar alertas de seguridad dentro de la zona del barrio en la que vivís.',
        'El servicio se presta sin costo y con fines comunitarios. No es un servicio de emergencias: ante un hecho en curso corresponde llamar al 911 o al organismo que corresponda.',
      ],
    },
    {
      titulo: '2. Tu cuenta',
      parrafos: [
        'Para usar la plataforma tenés que registrarte con datos reales y mantener tu contraseña en reserva. Sos responsable de la actividad que se realice desde tu cuenta.',
        'La cuenta queda habilitada para publicar una vez que confirmás tu correo electrónico. Hasta entonces el acceso es de solo lectura.',
        'Cada cuenta pertenece a una zona. Vas a ver y a poder publicar en esa zona.',
      ],
    },
    {
      titulo: '3. Cómo se publica',
      parrafos: [
        'Las publicaciones y alertas deben referirse a hechos del barrio y describirse de buena fe. No se admiten contenidos que señalen a una persona por su aspecto, origen o condición, ni acusaciones sin sustento, ni datos de contacto de terceros sin su permiso.',
        'La moderación puede ocultar una publicación que incumpla estas reglas y, ante incumplimientos reiterados, dar de baja la cuenta.',
      ],
    },
    {
      titulo: '4. Responsabilidad',
      parrafos: [
        'El contenido lo aportan los vecinos. Barrio Watch no verifica cada publicación y no responde por las decisiones que se tomen a partir de ellas. Las alertas marcadas como verificadas fueron confirmadas por la moderación, lo que no las convierte en información oficial.',
      ],
    },
    {
      titulo: '5. Cambios y baja',
      parrafos: [
        'Podés dar de baja tu cuenta cuando quieras. Si se modifican estos términos se publica una versión nueva y se solicita una aceptación nueva; la versión que aceptaste queda registrada con su fecha.',
      ],
    },
  ],
}

export const PRIVACIDAD = {
  titulo: 'Política de privacidad',
  resumen: `Versión ${VERSION} · Barrio Watch`,
  secciones: [
    {
      titulo: '1. Qué datos se guardan',
      parrafos: [
        'Nombre y apellido, correo electrónico, la zona del barrio que elegiste y, si lo cargás, un teléfono de contacto. El teléfono es opcional: la cuenta funciona igual sin él.',
        'La contraseña nunca se guarda tal como la escribís: se almacena su hash con bcrypt, que no permite recuperar el original.',
        'También se registran la fecha y la versión de estos documentos que aceptaste, y la fecha en que confirmaste tu correo.',
      ],
    },
    {
      titulo: '2. Para qué se usan',
      parrafos: [
        'Para identificarte dentro del barrio, para mostrarte las publicaciones de tu zona y para enviarte los correos propios del servicio: la confirmación de la cuenta y la recuperación de la contraseña.',
        'No se usan con fines publicitarios ni se ceden a terceros.',
      ],
    },
    {
      titulo: '3. Qué ven los demás vecinos',
      parrafos: [
        'Tu nombre, tu apellido y tu zona acompañan a cada publicación que hacés. El correo electrónico no se muestra. El teléfono, si lo cargaste, se comparte únicamente con los vecinos de tu zona y con ese fin: que puedan comunicarse ante una urgencia.',
      ],
    },
    {
      titulo: '4. Zona y ubicación',
      parrafos: [
        'La plataforma trabaja con la zona que elegiste (una manzana o sector), no con tu dirección exacta ni con la ubicación del dispositivo. No se registra tu posición en tiempo real.',
      ],
    },
    {
      titulo: '5. Conservación y derechos',
      parrafos: [
        'Los datos se conservan mientras la cuenta esté activa. Podés pedir que se corrijan o que se dé de baja la cuenta escribiendo a la moderación del barrio.',
        'Las sesiones abiertas se cierran al cambiar la contraseña, de modo que un acceso ajeno queda revocado.',
      ],
    },
  ],
}

export const DOCUMENTOS = { terminos: TERMINOS, privacidad: PRIVACIDAD }
