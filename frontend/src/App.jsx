import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import './App.css'

import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

import Principal from './pages/Principal.jsx'
import Auth from './pages/Auth.jsx'
import Manual from './pages/Manual.jsx'
import Perfil from './pages/Perfil.jsx'
import Admin from './pages/Admin.jsx'
import Renta from './pages/Renta.jsx'

function AppContent() {
  const location = useLocation();

  // Rutas donde no se muestra el header
  const hideHeaderRoutes = ["/login", "/admin"];

  return (
    <>
      {!hideHeaderRoutes.includes(location.pathname) && <Header />}

      <Routes>
        <Route path="/" element={<Principal />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/renta" element={<Renta />} />
      </Routes>

      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App
