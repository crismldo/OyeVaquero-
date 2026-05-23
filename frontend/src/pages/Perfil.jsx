import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import avatarVaquero from "../assets/images/cowboyhat.jpg";
import "./Perfil.css";

function Perfil() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ nombre: "", apellido: "", pais: "", correo: "" });

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2000);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const datosBasicos = JSON.parse(localStorage.getItem("usuario"));
    if (!datosBasicos?.id) return;

    fetch(`http://localhost:5000/api/usuarios/${datosBasicos.id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsuario(data);
      })
      .catch(err => console.error("Error al cargar perfil:", err));

  }, [navigate]);

  
  // ------ EDITAR INFORMACIÓN ------
  const editarInformacion = () => {
    setEditData({ nombre: usuario.nombre, apellido: usuario.apellido, pais: usuario.pais, correo: usuario.correo });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const { nombre, apellido, pais } = editData;

    if (!nombre?.trim() || !apellido?.trim() || !pais?.trim()) {
      return showToast("Todos los campos son obligatorios.");
    }

    //  solo letras
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(nombre.trim()) || !soloLetras.test(apellido.trim())) {
      return showToast("Nombre y apellido solo pueden contener letras.");
    }

    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!correoRegex.test(editData.correo.trim())) {
      return showToast("Por favor ingresa un correo válido.");
    }

    try {
      const res = await fetch(`http://localhost:5000/api/usuarios/${usuario._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ 
          nombre: nombre.trim(), 
          apellido: apellido.trim(), 
          pais: pais.trim(), 
          correo: editData.correo.trim().toLowerCase() })
      });

      if (res.ok) {
        const data = await res.json();
        setUsuario(data);
        setShowEditModal(false);
        showToast("¡Información actualizada!");
      } else {
        showToast("Error al actualizar la información.");
      }
    } catch (error) {
      showToast("Error de conexión con el servidor.");
    }
  };

  // --- CAMBIAR CONTRASEÑA ---
  const handleSavePassword = async () => {
    if (newPassword.trim() === "") return showToast("La contraseña no puede estar vacía.");
    if (newPassword !== confirmPassword) return showToast("Las contraseñas no coinciden.");
    console.log(newPassword);
    console.log(confirmPassword);

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return showToast("Debe tener al menos 8 caracteres, una mayúscula, minúscula y un número.");
    }

    try {
      const res = await fetch(`http://localhost:5000/api/usuarios/${usuario._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ password: newPassword })
      });

      if (res.ok) {
        showToast("¡Contraseña actualizada con éxito!");
        setNewPassword(""); setConfirmPassword(""); setShowModal(false);
      } else {
        showToast("Error al actualizar la contraseña en el servidor.");
      }
    } catch (error) { showToast("Error de conexión con el servidor."); }
  };

  // --- CERRAR SESIÓN ---
  const logout = () => {
    window.sessionStorage.removeItem("renta-active-trip");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  if (!usuario) return null;

  return (
    <div className="perfil-page">
      <div className="perfil-body">
        <div className="perfil-card-container anim-slide-up">

          {/* SIDEBAR IZQUIERDO */}
          <div className="profile-sidebar">
            <div className="avatar-frame" style={{ position: "relative", cursor: "pointer" }}>
              <img src={avatarVaquero} alt="Avatar" className="user-photo" style={{ transition: "transform 0.3s" }} />
              <div className="badge-rank icon-sway" style={{ position: "absolute", bottom: 0, right: 0 }}>
                <i className="bx bxs-camera"></i>
              </div>
            </div>

            <h2 className="rye-font user-name">{usuario.nombre} {usuario.apellido}</h2>
            <p className="since-text">{usuario.correo}</p>
            
            {usuario.adeudo > 0 ? (
               <div className="status-pill" style={{background: '#ffebeb', color: '#a84b3c', borderColor: '#a84b3c'}}>
                 🚨 ADEUDO: ${usuario.adeudo} MXN
               </div>
            ) : (
              <div className="status-pill">
                <span className="dot pulse-green"></span> ACTIVO
              </div>
            )}

            <button className="leather-btn" type="button" style={{ marginTop: "16px" }} onClick={() => setShowModal(true)}>
              <i className="bx bxs-lock-alt"></i> CAMBIAR CONTRASEÑA
            </button>

            {usuario.rol === "admin" && (
              <button className="leather-btn" type="button" style={{ marginTop: "10px" }} onClick={() => navigate("/admin")}>
                <i className="bx bxs-cog"></i> PANEL DE CONTROL
              </button>
            )}

            <button className="leather-btn danger" type="button" style={{ marginTop: "10px" }} onClick={logout}>
              <i className="bx bx-log-out"></i> CERRAR SESIÓN
            </button>
          </div>

          {/* PANEL DERECHO */}
          <div className="profile-main">
            <header className="profile-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <img src={logo} alt="Logo" className="mini-logo anim-float" style={{ margin: 0 }} />
              <button className="leather-btn" type="button" onClick={editarInformacion} style={{ width: "auto", padding: "8px 15px", fontSize: "0.85rem", margin: 0 }}>
                <i className="bx bxs-edit"></i> EDITAR DATOS
              </button>
            </header>

            <div className="info-grid">
              <div className="field">
                <span className="label">País</span>
                <p className="value">{usuario.pais}</p>
              </div>
              <div className="field">
                <span className="label">Fecha de nacimiento</span>
                <p className="value">{new Date(usuario.fechaNacimiento).toLocaleDateString('es-MX')}</p>
              </div>
              <div className="field full">
                <span className="label">Correo electrónico</span>
                <p className="value">{usuario.correo}</p>
              </div>
            </div>

            <div className="actions-column">
              <button className="leather-btn" type="button" onClick={() => setShowWalletModal(true)}>
                <i className="bx bxs-credit-card"></i> MÉTODOS DE PAGO
              </button>
              <button className="leather-btn" type="button" onClick={() => navigate("/renta")}>
                <i className="bx bxs-map-pin"></i> IR A RENTAR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {showModal && (
        <div className="modal active" style={{ display: "grid" }} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box">
            <h3>Actualizar Seguridad</h3>
            <input type="password" className="mod-input" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <input type="password" className="mod-input" placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <div className="mod-btns">
              <button className="btn-save" type="button" onClick={handleSavePassword}>Guardar</button>
              <button className="btn-close" type="button" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR INFORMACIÓN */}
      {showEditModal && (
        <div className="modal active" style={{ display: "grid" }} onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="modal-box">
            <h3>Editar Información</h3>
            <input
              type="text" className="mod-input" placeholder="Nombre"
              value={editData.nombre}
              onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
            />
            <input
              type="text" className="mod-input" placeholder="Apellido"
              value={editData.apellido}
              onChange={(e) => setEditData({ ...editData, apellido: e.target.value })}
            />
            <input
              type="text" className="mod-input" placeholder="País"
              value={editData.pais}
              onChange={(e) => setEditData({ ...editData, pais: e.target.value })}
            />
            <input
              type="email" className="mod-input" placeholder="Correo electrónico"
              value={editData.correo}
              onChange={(e) => setEditData({ ...editData, correo: e.target.value })}
            />
            <div className="mod-btns">
              <button className="btn-save" type="button" onClick={handleSaveEdit}>Guardar</button>
              <button className="btn-close" type="button" onClick={() => setShowEditModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className={`perfil-toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

export default Perfil;