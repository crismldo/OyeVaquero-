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

  // ESTADOS DE LA CARTERA VIRTUAL (Vacío por defecto)
  const [walletMethods, setWalletMethods] = useState([]);
  const [newWalletMethod, setNewWalletMethod] = useState({ 
    brand: "Visa", 
    alias: "", 
    cardNumber: "",
    expiracion: "",
    cvv: "",
    titular: ""
  });

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2000);
  };

  const cargarTarjetas = async (token) => {
    try {
      const res = await fetch("http://localhost:5000/api/usuarios/metodos-pago", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setWalletMethods(await res.json());
      }
    } catch (error) {
      console.error("Error al cargar tarjetas:", error);
    }
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

      cargarTarjetas(token);
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

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!soloLetras.test(nombre.trim()) || !soloLetras.test(apellido.trim()) || !soloLetras.test(pais.trim())) {
      return showToast("Nombre, apellido y pais solo pueden contener letras.");
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


  // --- AGREGAR NUEVA TARJETA ---
  const addWalletMethod = async (event) => {
    event.preventDefault();
    const digitsOnly = newWalletMethod.cardNumber.replace(/\D/g, "");
    
    if (digitsOnly.length < 15 || digitsOnly.length > 16) return showToast("Número de tarjeta inválido.");
    if (newWalletMethod.alias.trim() === "") return showToast("Agrega un alias para identificarla.");
    
    const expRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expRegex.test(newWalletMethod.expiracion)) return showToast("Fecha de expiración inválida. Usa el formato MM/AA.");

    const [mes, anio] = newWalletMethod.expiracion.split("/");
    const expDate = new Date(2000 + parseInt(anio), parseInt(mes) - 1, 1);
    if (expDate < new Date()) return showToast("⚠️ Esta tarjeta ya está vencida.");

    // Validar CVV (3 dígitos, o 4 para Amex)
    const cvvLength = newWalletMethod.brand === "Amex" ? 4 : 3;
    const cvvRegex = new RegExp(`^\\d{${cvvLength}}$`);
    if (!cvvRegex.test(newWalletMethod.cvv)) return showToast(`⚠️ El CVV debe tener ${cvvLength} dígitos.`);
    if (newWalletMethod.cvv === "000") return showToast("⚠️ CVV inválido.");

    if (!newWalletMethod.titular.trim()) return showToast("Ingresa el nombre del titular.");

    try {
      const res = await fetch("http://localhost:5000/api/usuarios/metodos-pago", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ 
          numeroTarjeta: digitsOnly,
          alias: newWalletMethod.alias.trim(),
          expiracion: newWalletMethod.expiracion,
          titular: newWalletMethod.titular.trim()
        })
      });

      if (res.ok) {
        showToast("💳 ¡Tarjeta agregada a tu Cartera Virtual!");
        setNewWalletMethod({ brand: "Visa", alias: "", cardNumber: "", expiracion: "", cvv: "", titular: "" });
        cargarTarjetas(localStorage.getItem("token"));
      } else {
        const data = await res.json();
        showToast(data.message || "Error al guardar la tarjeta.");
      }
    } catch (error) {
      showToast("Error de conexión al guardar.");
    }
  };

  // --- ELIMINAR TARJETA ---
  const removeWalletMethod = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/usuarios/metodos-pago/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });

      if (res.ok) {
        showToast("Tarjeta eliminada correctamente.");
        cargarTarjetas(localStorage.getItem("token"));
      } else {
        const data = await res.json();
        showToast(data.message || "Error al eliminar la tarjeta.");
      }
    } catch (error) {
      showToast("Error de conexión al eliminar.");
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


      {/* MODAL CARTERA VIRTUAL */}
      {showWalletModal && (
        <div className="modal active" style={{ display: "grid" }} onClick={(e) => { if (e.target === e.currentTarget) setShowWalletModal(false); }}>
          
          <div className="modal-box wallet-modal-box" style={{ maxWidth: "650px", width: "90%" }}>
            
            <h3>Cartera virtual</h3>
            <p className="wallet-subtitle" style={{marginBottom: "15px", color: "#6f604f"}}>Administra tus métodos de pago guardados.</p>

            {/* LISTA DE TARJETAS */}
            <div className="wallet-list" style={{marginBottom: "20px"}}>
              {walletMethods.length === 0 ? (
                <div style={{padding: "15px", background: "#e8ddca", borderRadius: "10px", textAlign: "center", border: "1px dashed rgba(109,87,61,.4)"}}>
                  <p className="wallet-empty" style={{margin: 0, color: "#6f604f"}}>No tienes tarjetas guardadas.</p>
                </div>
              ) : (
                walletMethods.map((method) => (
                  <article className="wallet-item" key={method._id} style={{padding: "15px", border: "1px solid rgba(109,87,61,.2)", borderRadius: "10px", marginBottom: "10px", background: "#fdf5e6", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    <div style={{textAlign: "left"}}>
                      <p style={{margin: 0, fontWeight: "bold", color: "#944a39"}}>{method.alias}</p>
                      <p className="wallet-brand" style={{margin: 0, fontWeight: "bold", color: "#2f2419"}}>💳 {method.marca} •••• {method.ultimos4}</p>
                      <p className="wallet-alias" style={{margin: "4px 0 0", fontSize: "0.85em", color: "#6f604f"}}>Tarjeta Guardada</p>
                    </div>
                    <button type="button" onClick={() => removeWalletMethod(method._id)} style={{background: "transparent", border: "1px solid #a84b3c", color: "#a84b3c", padding: "6px 12px", borderRadius: "8px", cursor: "pointer"}}>
                      Eliminar
                    </button>
                  </article>
                ))
              )}
            </div>

            <div style={{ borderTop: "1px dashed rgba(109,87,61,.3)", margin: "20px 0" }}></div>

            {/* FORMULARIO */}
            <form className="wallet-form" onSubmit={addWalletMethod} style={{ width: "100%", boxSizing: "border-box", display:"flex", flexDirection:"column"}}>
              
              <div style={{ display: "flex", gap: "10px", width: "100%", marginBottom: "15px", flexDirection:"column" }}>
                <div style={{ display: "flex", gap: "10px", width: "100%", marginBottom: "15px" }}>
                  <label style={{ flex: "1", textAlign: "left", fontSize: "0.85rem", color: "#6f604f" }}>
                    Marca
                    <select className="mod-input" style={{ width: "100%", margin: "5px 0 0", padding: "12px", boxSizing: "border-box" }} value={newWalletMethod.brand} onChange={(e) => setNewWalletMethod((prev) => ({ ...prev, brand: e.target.value }))}>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="Amex">Amex</option>
                    </select>
                  </label>

                  <label style={{ flex: "1.5", textAlign: "left", fontSize: "0.85rem", color: "#6f604f" }}>
                    Titular
                    <input className="mod-input" type="text" placeholder="Como en la tarjeta"
                      style={{ width: "100%", margin: "5px 0 0", padding: "12px", boxSizing: "border-box" }}
                      value={newWalletMethod.titular}
                      onChange={(e) => setNewWalletMethod((prev) => ({ ...prev, titular: e.target.value }))}
                    />
                  </label>
                  
                  <label style={{ flex: "2", textAlign: "left", fontSize: "0.85rem", color: "#6f604f" }}>
                    Tarjeta
                    <input className="mod-input" type="text" inputMode="numeric" placeholder="1234 5678 9012 3456" style={{ width: "100%", margin: "5px 0 0", padding: "12px", boxSizing: "border-box" }} value={newWalletMethod.cardNumber} onChange={(e) => setNewWalletMethod((prev) => ({ ...prev, cardNumber: e.target.value }))} />
                  </label>
                </div>

                <div style={{ display: "flex", gap: "10px", width: "100%", marginBottom: "15px" }}>
                  <label style={{ flex: "1.2", textAlign: "left", fontSize: "0.85rem", color: "#6f604f" }}>
                    Alias
                    <input className="mod-input" type="text" placeholder="Ejemplo: Nomina" style={{ width: "100%", margin: "5px 0 0", padding: "12px", boxSizing: "border-box" }} value={newWalletMethod.alias} onChange={(e) => setNewWalletMethod((prev) => ({ ...prev, alias: e.target.value }))} />
                  </label>

                  <label style={{ flex: "1", textAlign: "left", fontSize: "0.85rem", color: "#6f604f" }}>
                    Expiración
                    <input className="mod-input" type="text" placeholder="MM/AA" maxLength={5}
                      style={{ width: "100%", margin: "5px 0 0", padding: "12px", boxSizing: "border-box" }}
                      value={newWalletMethod.expiracion}
                      onChange={(e) => setNewWalletMethod((prev) => ({ ...prev, expiracion: e.target.value }))} 
                    />
                  </label>

                  <label style={{ flex: "1", textAlign: "left", fontSize: "0.85rem", color: "#6f604f" }}>
                    CVV
                    <input className="mod-input" type="password" placeholder="•••" maxLength={4}
                      style={{ width: "100%", margin: "5px 0 0", padding: "12px", boxSizing: "border-box" }}
                      value={newWalletMethod.cvv}
                      onChange={(e) => setNewWalletMethod((prev) => ({ ...prev, cvv: e.target.value }))} 
                    />
                  </label>
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button className="btn-save" type="submit" style={{ width: "100%", background: "#3f7069" }}>Agregar metodo</button>
                <button className="btn-close" type="button" onClick={() => setShowWalletModal(false)} style={{ width: "100%" }}>Cerrar</button>
              </div>

            </form>
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