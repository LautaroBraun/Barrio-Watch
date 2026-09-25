# Sprint 1 — Decisiones tomadas durante el desarrollo

Texto listo para sumar al informe (sección 9). Cada punto indica dónde va.

## 9.4.3 HU03 — agregar después de "Reglas de sesión definidas"

**Invalidación inmediata del token.** Para que el cierre de sesión invalide el
token de forma inmediata (CA 3.3) sin esperar a su vencimiento, cada token JWT
lleva el identificador del registro correspondiente en la tabla `sesiones`. Al
cerrar sesión se completa el nuevo campo `fecha_cierre` de ese registro y, a
partir de ese momento, el servidor rechaza el token aunque todavía esté dentro
de las 12 horas de vigencia.

## 9.4.4 HU04 — agregar a "Política de bloqueo definida"

El aviso de bloqueo se muestra desde el quinto intento fallido: en el mismo
momento en que se completa la quinta falla, el sistema ya informa que el acceso
quedó bloqueado y a qué hora podrá volver a intentar, en lugar de esperar a un
sexto intento. Durante el bloqueo las credenciales no se procesan y esos
intentos no se registran, por lo que no extienden la duración del bloqueo.

Además del inicio de sesión exitoso, **restablecer la contraseña (HU05) también
reinicia el contador**: el caso más común de bloqueo es el de un vecino que
olvidó su contraseña, y completar la recuperación demuestra que es el dueño de
la cuenta.

## 9.4.5 HU05 — agregar a "Impacto en el modelo de datos"

Además de la tabla `tokens_recuperacion`, el circuito requirió agregar a la
tabla `sesiones` el campo:

| Campo | Tipo de dato | Restricción | Descripción |
| --- | --- | --- | --- |
| fecha_cierre | TIMESTAMPTZ | NULL, CHECK (fecha_cierre >= fecha_inicio) | Momento en que la sesión se cerró. Vacío mientras la sesión está abierta. |

Al restablecer la contraseña se completa `fecha_cierre` en todas las sesiones
abiertas de la cuenta, lo que cumple el CA 5.5 (invalidar las sesiones activas
en cualquier dispositivo). El mismo campo sostiene el cierre de sesión de HU03.

En el entorno de desarrollo, si no hay un servidor de correo configurado, el
enlace de recuperación se muestra en la consola del backend. En producción se
configura un servidor SMTP mediante variables de entorno.

## Seguridad de la base (sección 3.3 o anexo)

Supabase expone las tablas del esquema `public` a través de su Data API usando
una clave pública (anon key). Para que ningún usuario pueda leer datos
sensibles —como `usuarios.password_hash`— directamente desde el navegador, se
activó **Row Level Security** en todas las tablas sin definir políticas de
acceso. El backend se conecta con el usuario propietario de la base, que no
está alcanzado por esas restricciones.

Todos estos cambios están en `database/migraciones/001_sprint1_autenticacion.sql`.
