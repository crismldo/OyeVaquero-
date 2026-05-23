import { Link } from "react-router-dom";
import logo from "../assets/images/logo.png";

function Manual() {
  return (
    <div style={{ minHeight: "100vh", background: "#e8ddca", color: "#2f2419", padding: "32px 24px" }}>
      <div style={{ maxWidth: "980px", margin: "0 auto", background: "#fff8ed", border: "1px solid rgba(109,87,61,.24)", borderRadius: "18px", padding: "28px" }}>
        <header style={{ display: "grid", gap: "12px", justifyItems: "center", textAlign: "center", marginBottom: "18px" }}>
          <h1 style={{ margin: 0 }}>Guia del Vaquero</h1>
          <p style={{ margin: 0, color: "#6f604f" }}>Sigue estos pasos para rentar y usar tu ride de forma segura.</p>
        </header>

        <section style={{ display: "grid", gap: "12px" }}>
          <article style={{ border: "1px solid rgba(109,87,61,.24)", borderRadius: "12px", padding: "14px" }}>
            <h2 style={{ margin: "0 0 8px" }}>1. Elige estacion y vehiculo</h2>
            <p style={{ margin: 0 }}>Selecciona una ubicacion en el mapa, revisa el catalogo y confirma tu seleccion.</p>
          </article>
          <article style={{ border: "1px solid rgba(109,87,61,.24)", borderRadius: "12px", padding: "14px" }}>
            <h2 style={{ margin: "0 0 8px" }}>2. Realiza el pago</h2>
            <p style={{ margin: 0 }}>Completa tus datos y confirma la compra para generar tu ticket QR.</p>
          </article>
          <article style={{ border: "1px solid rgba(109,87,61,.24)", borderRadius: "12px", padding: "14px" }}>
            <h2 style={{ margin: "0 0 8px" }}>3. Inicia y finaliza viaje</h2>
            <p style={{ margin: 0 }}>Escanea el ticket, monitorea tu tiempo y usa los botones de soporte si lo necesitas.</p>
          </article>
        </section>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <Link to="/renta" style={{ textDecoration: "none", background: "#b88642", color: "#211a14", padding: "10px 14px", borderRadius: "999px", fontWeight: 700 }}>
            Volver a Renta
          </Link>
          <Link to="/" style={{ textDecoration: "none", border: "1px solid rgba(109,87,61,.35)", color: "#2f2419", padding: "10px 14px", borderRadius: "999px", fontWeight: 700 }}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Manual;
