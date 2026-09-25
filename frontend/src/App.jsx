import { Route, Routes } from 'react-router'
import { RutaPrivada, SoloInvitados } from './components/Guardas.jsx'
import Inicio from './pages/Inicio.jsx'
import Login from './pages/Login.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import Recuperar from './pages/Recuperar.jsx'
import Registro from './pages/Registro.jsx'
import Restablecer from './pages/Restablecer.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<SoloInvitados />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
      </Route>
      <Route path="/recuperar" element={<Recuperar />} />
      <Route path="/restablecer" element={<Restablecer />} />
      <Route element={<RutaPrivada />}>
        <Route path="/" element={<Inicio />} />
      </Route>
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}
