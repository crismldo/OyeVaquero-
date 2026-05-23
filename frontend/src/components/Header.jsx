import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import userpng from "../assets/images/user1.png";
import './Header.css';

function Header(){
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Verificar si hay sesión activa
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, []);
    
    return(
        <header className="header">
        <div className="header-top">
          <img className="brand-logo" src="/img/logo.png" alt="Oye Vaquero" />
        </div>

        <div className="header-nav-row">
          <div className="nav-social" aria-label="Redes sociales">
            <a href="https://www.facebook.com/oyevaquero" target="_blank" rel="noopener" aria-label="Facebook">f</a>
            <a href="https://x.com/oyevaquero" target="_blank" rel="noopener" aria-label="X">x</a>
            <a href="https://www.instagram.com/oyevaquero" target="_blank" rel="noopener" aria-label="Instagram">i</a>
            <Link to="/login" aria-label="Login">o</Link>
          </div>

          <nav className="nav">
            <HashLink smooth to="/#catalogo">
              Catalogo
            </HashLink>
            <Link to="/renta">Renta</Link>
            <Link to="/manual">Manual</Link>
          </nav>

          {/* Mostrar perfil o botón de login según sesión */}
            {isLoggedIn ? (
            <Link to="/perfil" className="nav-user" aria-label="Perfil">
            <img id="user-icon" src={userpng} alt="Perfil" />
            </Link>
            ) : (
            <Link to="/login" className="nav-login-btn" aria-label="Iniciar sesión">
            Iniciar sesión
            </Link>
            )}
        </div>
      </header>
    )
}

export default Header;

