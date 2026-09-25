# Barrio Watch

Sistema web de gestión comunitaria hiperlocal para barrios.
Permite a los vecinos reportar incidentes de seguridad, compartir
información sobre servicios locales y coordinar la ayuda mutua,
reemplazando los grupos de WhatsApp desorganizados por una
plataforma estructurada.

## Materia

Proyecto desarrollado para **Práctica Profesionalizante 1**
Carrera: Desarrollo de Software - Instituto Superior Santo Domingo
Semestre: 4to - Año 2026

## Integrantes

- Lautaro Laborda
- Lucas Nozikovsky
- Juan Rasjido

## Tecnologías

- **Frontend:** React + Tailwind CSS (Vite)
- **Backend:** Node.js + Express
- **Base de datos:** Supabase (PostgreSQL)
- **Control de versiones:** Git + GitHub

## Estado

**Sprint 1 — Inicio de sesión.** Implementadas las historias HU01 a HU05:

| HU   | Historia                           | Dónde está                                                       |
| ---- | ---------------------------------- | ---------------------------------------------------------------- |
| HU01 | Registro de usuario                | `frontend/src/pages/Registro.jsx`, `backend/src/routes/usuarios.js` |
| HU02 | Validación de los datos de registro | `shared/validaciones.js` (la usan el cliente y el servidor)      |
| HU03 | Inicio de sesión                   | `frontend/src/pages/Login.jsx`, `backend/src/routes/auth.js`     |
| HU04 | Verificación de credenciales       | `backend/src/routes/auth.js`, `backend/src/services/sesiones.js` |
| HU05 | Recuperación de contraseña         | `frontend/src/pages/Recuperar.jsx` y `Restablecer.jsx`           |

Cada criterio de aceptación tiene su prueba automática en `backend/test/`
(el nombre de cada prueba empieza con el número de CA).

## Estructura

```
shared/     Reglas de validación compartidas (HU02)
backend/    API REST con Express
frontend/   Interfaz en React
database/   esquema.sql (modelo completo) y migraciones/
docs/       Decisiones del sprint, listas para el informe
```

## Cómo correrlo

Requisitos: Node.js 22 o superior y una base PostgreSQL (Supabase o local).

1. **Instalar dependencias** (desde la raíz, instala las tres partes):

   ```bash
   npm install
   ```

2. **Preparar la base de datos** en el SQL Editor de Supabase:
   - Si ya tienen cargado el modelo de PP2: ejecuten solo
     `database/migraciones/001_sprint1_autenticacion.sql` (no borra datos).
   - Si es una base nueva: ejecuten `database/esquema.sql`
     (⚠️ empieza borrando las tablas).

3. **Configurar el backend:** copien `backend/.env.example` a `backend/.env`
   y completen `DATABASE_URL` y `JWT_SECRET`.

4. **Levantar todo:**

   ```bash
   npm run dev
   ```

   Frontend en http://localhost:5173 y API en http://localhost:3000.

Sin SMTP configurado, el enlace de recuperación de contraseña (HU05) se
imprime en la consola del backend para poder probar el circuito completo.

### Cuentas de prueba

Todas usan la contraseña `Barrio2026`:

| Correo                  | Rol           | Zona      |
| ----------------------- | ------------- | --------- |
| lautaro@barriowatch.com | administrador | Manzana 1 |
| lucas@barriowatch.com   | moderador     | Manzana 1 |
| juan@barriowatch.com    | vecino        | Manzana 2 |
| marta@barriowatch.com   | vecino        | Manzana 3 |

### Pruebas

Las pruebas de integración recrean la base antes de cada caso, así que
necesitan una base **aparte** (nunca la de producción):

```bash
# en backend/.env
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/barrio_watch_test

npm test
```

Sin `TEST_DATABASE_URL` se corren solo las pruebas de validación.

## Las pantallas

Cada pantalla tiene su propia ilustración, pensada para que el barrio
"te mire" (y te cuide):

- **Iniciar sesión:** cuatro vecinos (Tomás, Luz, Rosa y Nico) siguen con la
  mirada al puntero y leen lo que vas escribiendo. Si la contraseña es
  incorrecta se sorprenden y niegan con la cabeza; si tocás el ojo para ver
  la contraseña se dan vuelta para no mirar (aunque Nico espía). Tras cinco
  intentos fallidos se preocupan y el aviso naranja muestra la cuenta
  regresiva; al entrar, festejan.
- **Registro:** una casa en plano que se construye mientras completás los
  datos. Cada requisito de la contraseña prende una ventana, el buzón levanta
  la banderita con un correo válido y el cartel de la esquina muestra tu zona.
- **Olvidé mi contraseña:** una paloma mensajera sale volando con el enlace.
- **Nueva contraseña:** a la llave le crece un diente por cada requisito
  cumplido; al guardar entra en el candado y lo abre. Si el enlace venció o ya
  se usó, la llave aparece rota y se ofrece pedir otro.
- **Inicio:** saludo, zona del vecino y las publicaciones de su zona.

Las animaciones respetan la preferencia del sistema de "reducir movimiento".

## API

| Método | Ruta                               | Descripción                                    |
| ------ | ---------------------------------- | ---------------------------------------------- |
| GET    | `/api/zonas`                       | Zonas activas (para el registro)               |
| POST   | `/api/usuarios/registro`           | HU01 · Crea la cuenta                          |
| POST   | `/api/auth/login`                  | HU03/HU04 · Devuelve el token (12 h)           |
| GET    | `/api/auth/sesion`                 | Datos del usuario con la sesión abierta        |
| POST   | `/api/auth/logout`                 | Invalida el token                              |
| POST   | `/api/auth/recuperar`              | HU05 · Envía el enlace de recuperación         |
| POST   | `/api/auth/restablecer/verificar`  | HU05 · Dice si el enlace sirve                 |
| POST   | `/api/auth/restablecer`            | HU05 · Guarda la nueva contraseña              |
| GET    | `/api/publicaciones`               | Publicaciones de la zona del usuario           |

## Decisiones técnicas del Sprint 1

- **`sesiones.fecha_cierre`**: el token JWT lleva el id de su fila en
  `sesiones`. Cerrar sesión (CA 3.3) o restablecer la contraseña (CA 5.5)
  completa esa columna y el token deja de valer al instante.
- **Bloqueo por reintentos**: se calcula sobre los intentos fallidos de
  `sesiones` desde el último acceso exitoso. Restablecer la contraseña también
  levanta el bloqueo, porque demuestra que la persona es dueña del correo.
- **Tokens de recuperación**: se guarda el hash SHA-256, nunca el token.
- **Mensajes genéricos**: el login y la recuperación responden igual exista o
  no la cuenta, para no revelar qué correos están registrados.
- **RLS en Supabase**: las migraciones activan Row Level Security en todas
  las tablas. Sin eso, cualquiera con la anon key podría leer
  `usuarios.password_hash` desde la Data API.
