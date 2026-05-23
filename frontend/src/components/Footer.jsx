import "./Footer.css";

function Footer() {
  return (
    <footer className="principal-footer" aria-label="Pie de pagina">
      <div className="principal-footer-shell">
        <nav className="principal-footer-top-nav" aria-label="Navegacion del footer">
          <a href="/#catalogo">Catalogo</a>
          <a href="/renta">Renta</a>
          <a href="/manual">Manual</a>
          <a href="#contacto">Contacto</a>
        </nav>

        <div className="principal-footer-social" aria-label="Redes sociales">
          <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="social-item" aria-label="LinkedIn">
            <span className="social-dot">in</span>
            <span>LinkedIn</span>
          </a>
          <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="social-item" aria-label="YouTube">
            <span className="social-dot">yt</span>
            <span>YouTube</span>
          </a>
          <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="social-item" aria-label="Facebook">
            <span className="social-dot">f</span>
            <span>Facebook</span>
          </a>
          <a href="https://www.pinterest.com" target="_blank" rel="noopener noreferrer" className="social-item" aria-label="Pinterest">
            <span className="social-dot">p</span>
            <span>Pinterest</span>
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-item" aria-label="Twitter">
            <span className="social-dot">x</span>
            <span>Twitter</span>
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="social-item" aria-label="Instagram">
            <span className="social-dot">ig</span>
            <span>Instagram</span>
          </a>
          <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="social-item" aria-label="Google">
            <span className="social-dot">g+</span>
            <span>Google+</span>
          </a>
        </div>
      </div>

      <div className="principal-footer-lower">
        <div className="principal-footer-shell">
          <div className="principal-footer-message">
            <h3>¡Orgullosamente regiomontanos!</h3>
            <p>De Monterrey para el mundo ¡Contáctanos!</p>
          </div>

          <div className="principal-footer-contact-row" id="contacto">
            <a href="mailto:info.oyevaquero@gmail.com" className="contact-chip contact-email">info.oyevaquero@gmail.com</a>
            <a href="tel:+15087460033" className="contact-chip">(508) 746-0033</a>
            <div className="contact-chip contact-address">Ciudad Universitaria · San Nicolás de los Garza, Nuevo León</div>
          </div>

          <div className="principal-footer-bottom">
            <p>© 2026 Oye Vaquero. All rights reserved.</p>
            <p>Template-inspired footer adaptation.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
