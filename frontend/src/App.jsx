import { Route, Routes } from 'react-router'
import { RutaPrivada, SoloInvitados } from './components/Guardas.jsx'
import Inicio from './pages/Inicio.jsx'
import Login from './pages/Login.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import Recuperar from './pages/Recuperar.jsx'
import Registro from './pages/Registro.jsx'
import Restablecer from './pages/Restablecer.jsx'
import Verificar from './pages/Verificar.jsx'
import ZonaDetalle from './pages/ZonaDetalle.jsx'
import ZonaFormulario from './pages/ZonaFormulario.jsx'
import Zonas from './pages/Zonas.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<SoloInvitados />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
      </Route>
      <Route path="/recuperar" element={<Recuperar />} />
      <Route path="/restablecer" element={<Restablecer />} />
      {/* HU06 · CA 6.2: el enlace del correo se abre con o sin sesión abierta. */}
      <Route path="/verificar" element={<Verificar />} />
      <Route element={<RutaPrivada />}>
        <Route path="/" element={<Inicio />} />
        {/* HU13 a HU19 · ABM de zonas. El rol se controla además en el
            servidor: la pantalla sola no alcanza como permiso (CA 19.2). */}
        <Route path="/zonas" element={<Zonas />} />
        {/* «nueva» va antes que «:id» para que no se la coma la ruta con parámetro. */}
        <Route path="/zonas/nueva" element={<ZonaFormulario />} />
        <Route path="/zonas/:id" element={<ZonaDetalle />} />
        <Route path="/zonas/:id/editar" element={<ZonaFormulario />} />
      </Route>
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}
