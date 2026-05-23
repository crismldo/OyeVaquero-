import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const API_URL = "http://localhost:5000/api";

function Admin() {
  const navigate = useNavigate();
  const [estaciones, setEstaciones] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [toast, setToast] = useState("");
  const [usuarios, setUsuarios] = useState([]);

  const [estForm, setEstForm] = useState({ nombre: "", capacidadMaxima: "", lat: "", lng: "" });
  const [vehForm, setVehForm] = useState({ estacionActual: "", codigoVehiculo: "", tipo: "Bicicleta", precioPorMinuto: "" });

  // ESTADOS PARA REPORTES
  const [reporteActivo, setReporteActivo] = useState(null);
  const [datosReporte, setDatosReporte] = useState([]);

  //Edicion de vehiculos y estaciones
  const [showEditEstModal, setShowEditEstModal] = useState(false);
  const [showEditVehModal, setShowEditVehModal] = useState(false);
  const [editEst, setEditEst] = useState({ _id: "", nombre: "", capacidadMaxima: "" });
  const [editVeh, setEditVeh] = useState({ _id: "", precioPorMinuto: "", estado: "", estacionActual: "" });

  const getHeaders = (withContent = false) => {
    const token = localStorage.getItem("token");
    return {
      ...(withContent && { "Content-Type": "application/json" }),
      "Authorization": `Bearer ${token}`
    };
  };

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3000);
  };

  const cargarDatos = async () => {
    try {
      const [resEst, resVeh, resUsu] = await Promise.all([
        fetch(`${API_URL}/estaciones`, { headers: getHeaders() }),
        fetch(`${API_URL}/vehiculos`, { headers: getHeaders() }),
        fetch(`${API_URL}/usuarios`, { headers: getHeaders() }) // <--- NUEVO
      ]);

      if (resEst.status === 401 || resEst.status === 403) {
        navigate("/login");
        return;
      }

      setEstaciones(await resEst.json());
      setVehiculos(await resVeh.json());
      setUsuarios(await resUsu.json()); // <--- NUEVO
    } catch (error) {
      console.error("Error al cargar datos:", error);
      showToast("Error de conexión con el servidor.");
    }
  };

  const abrirEditarEstacion = (estacion) => {
    setEditEst({ _id: estacion._id, nombre: estacion.nombre, capacidadMaxima: estacion.capacidadMaxima });
    setShowEditEstModal(true);
  };

  const abrirEditarVehiculo = (vehiculo) => {
    setEditVeh({ _id: vehiculo._id, precioPorMinuto: vehiculo.precioPorMinuto, estado: vehiculo.estado, estacionActual: vehiculo.estacionActual?._id || vehiculo.estacionActual });
    setShowEditVehModal(true);
  };

  // FUNCIÓN PARA CARGAR REPORTES
  const verReporte = async (tipo) => {
    try {
      const res = await fetch(`${API_URL}/reportes/${tipo}`, { headers: getHeaders() });
      if (res.ok) {
        setDatosReporte(await res.json());
        setReporteActivo(tipo);
        showToast("Reporte generado con éxito.");
      } else {
        showToast("Error al cargar el reporte.");
      }
    } catch (error) {
      showToast("Error de conexión al cargar reportes.");
    }
  };

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario || usuario.rol !== "admin") return navigate("/");
    cargarDatos();
  }, []);

  const eliminarUsuario = async (id) => {
    if (!window.confirm("¿Seguro que quieres expulsar a este vaquero del pueblo? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Usuario eliminado correctamente.");
        cargarDatos();
      } else {
        showToast(data.message || "No se pudo eliminar al usuario.");
      }
    } catch {
      showToast("Error de conexión.");
    }
  };

  const guardarEstacion = async () => {
    const { nombre, capacidadMaxima, lat, lng } = estForm;

    if (!nombre.trim() || !capacidadMaxima || !lat || !lng) return showToast("Llena todos los campos de la estación.");

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/.test(nombre.trim())) return showToast("El nombre de la estación tiene caracteres inválidos.");

    if (isNaN(capacidadMaxima) || Number(capacidadMaxima) < 1 || !Number.isInteger(Number(capacidadMaxima))) return showToast("La capacidad debe ser un número entero mayor a 0.");

    if (isNaN(lat) || isNaN(lng)) return showToast("Las coordenadas deben ser números válidos.");
    if (Number(lat) < -90 || Number(lat) > 90) return showToast("La latitud debe estar entre -90 y 90.");
    if (Number(lng) < -180 || Number(lng) > 180) return showToast("La longitud debe estar entre -180 y 180.");

    try {
      const res = await fetch(`${API_URL}/estaciones`, {
        method: "POST", headers: getHeaders(true),
        body: JSON.stringify({ nombre: nombre.trim(), capacidadMaxima: Number(capacidadMaxima), coordenadas: { lat: Number(lat), lng: Number(lng) } })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("¡Estación creada con éxito!");
        setEstForm({ nombre: "", capacidadMaxima: "", lat: "", lng: "" });
        cargarDatos();
      } else showToast(data.message || "Error al guardar la estación.");
    } catch { showToast("Error de conexión."); }
  }; 

  const guardarVehiculo = async () => {
    const { estacionActual, codigoVehiculo, tipo, precioPorMinuto } = vehForm;

    if (!codigoVehiculo.trim() || !estacionActual || !precioPorMinuto) return showToast("Faltan datos para el vehículo.");
    if (isNaN(precioPorMinuto) || Number(precioPorMinuto) <= 0) return showToast("El precio por minuto debe ser mayor a 0.");

    try {
      const res = await fetch(`${API_URL}/vehiculos`, {
        method: "POST", headers: getHeaders(true),
        body: JSON.stringify({ codigoVehiculo: codigoVehiculo.trim(), tipo, precioPorMinuto: Number(precioPorMinuto), estacionActual, bateria: 100, estado: "Disponible" })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("¡Vehículo registrado con éxito!");
        setVehForm({ estacionActual: "", codigoVehiculo: "", tipo: "Bicicleta", precioPorMinuto: "" });
        cargarDatos();
      } else showToast(data.message || "Error al registrar vehículo.");
    } catch { showToast("Error de conexión."); }
  };

  const guardarEditEstacion = async () => {
    const { _id, nombre, capacidadMaxima } = editEst;

    if (!nombre.trim()) return showToast("El nombre no puede estar vacío.");
    if (isNaN(capacidadMaxima) || Number(capacidadMaxima) < 1 || !Number.isInteger(Number(capacidadMaxima))) return showToast("La capacidad debe ser un entero mayor a 0.");

    try {
      const res = await fetch(`${API_URL}/estaciones/${_id}`, {
        method: "PUT", headers: getHeaders(true),
        body: JSON.stringify({ nombre: nombre.trim(), capacidadMaxima: Number(capacidadMaxima) })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("¡Estación actualizada!");
        setShowEditEstModal(false);
        cargarDatos();
      } else showToast(data.message || "Error al actualizar la estación.");
    } catch { showToast("Error de conexión."); }
  };

  const guardarEditVehiculo = async () => {
    const { _id, precioPorMinuto, estado, estacionActual } = editVeh;

    if (isNaN(precioPorMinuto) || Number(precioPorMinuto) <= 0) return showToast("El precio debe ser mayor a 0.");
    if (!estado) return showToast("El estado es obligatorio.");
    if (!estacionActual) return showToast("La estación es obligatoria.");

    try {
      const res = await fetch(`${API_URL}/vehiculos/${_id}`, {
        method: "PUT", headers: getHeaders(true),
        body: JSON.stringify({ precioPorMinuto: Number(precioPorMinuto), estado, estacionActual })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("¡Vehículo actualizado!");
        setShowEditVehModal(false);
        cargarDatos();
      } else showToast(data.message || "Error al actualizar el vehículo.");
    } catch { showToast("Error de conexión."); }
  };

  const eliminarVehiculo = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar este vehículo?")) return;
    try {
      const res = await fetch(`${API_URL}/vehiculos/${id}`, { method: "DELETE", headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        showToast("Vehículo eliminado correctamente.");
        cargarDatos();
      } else showToast(data.message || "No se pudo eliminar el vehículo.");
    } catch { showToast("Error de conexión."); }
  };

  const eliminarEstacion = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta estación?")) return;
    try {
      const res = await fetch(`${API_URL}/estaciones/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        showToast("Estación eliminada correctamente.");
        cargarDatos();
      } else {
        showToast("No se pudo eliminar la estación.");
      }
    } catch {
      showToast("Error de conexión.");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <button className="admin-back-btn" onClick={() => navigate("/perfil")}>
          <i className="bx bx-left-arrow-alt"></i> Volver al Perfil
        </button>
        <h1 className="admin-title">Panel Administrativo</h1>
        <div className="admin-grid">

          {/* NUEVA ESTACIÓN */}
          <div className="admin-section-box">
            <h3><i className="bx bxs-map-pin"></i> Nueva Estación</h3>
            <div className="admin-input-group"><label>Nombre de la Estación</label><input type="text" placeholder="Ej. Metro Centro" value={estForm.nombre} onChange={(e) => setEstForm({ ...estForm, nombre: e.target.value })}/></div>
            <div className="admin-input-group"><label>Capacidad Máxima</label><input type="number" placeholder="Ej. 20" value={estForm.capacidadMaxima} onChange={(e) => setEstForm({ ...estForm, capacidadMaxima: e.target.value })}/></div>
            <div className="admin-coords-row">
              <div className="admin-input-group"><label>Latitud (-90 a 90)</label><input type="number" placeholder="X" value={estForm.lat} onChange={(e) => setEstForm({ ...estForm, lat: e.target.value })}/></div>
              <div className="admin-input-group"><label>Longitud (-180 a 180)</label><input type="number" placeholder="Y" value={estForm.lng} onChange={(e) => setEstForm({ ...estForm, lng: e.target.value })}/></div>
            </div>
            <button className="admin-btn-save" type="button" onClick={guardarEstacion}><i className="bx bx-plus-circle"></i> Guardar Estación</button>
          </div>

          {/* NUEVO VEHÍCULO */}
          <div className="admin-section-box">
            <h3><i className="bx bxs-car"></i> Nuevo Vehículo</h3>
            <div className="admin-input-group"><label>Asignar a Estación</label>
              <select value={vehForm.estacionActual} onChange={(e) => setVehForm({ ...vehForm, estacionActual: e.target.value })}>
                <option value="" disabled>Selecciona estación</option>
                {estaciones.map((est) => <option key={est._id} value={est._id}>{est.nombre}</option>)}
              </select>
            </div>
            <div className="admin-input-group"><label>Código de Serie</label><input type="text" placeholder="Ej. BICI-101" value={vehForm.codigoVehiculo} onChange={(e) => setVehForm({ ...vehForm, codigoVehiculo: e.target.value })}/></div>
            <div className="admin-input-group"><label>Tipo de Vehículo</label>
              <select value={vehForm.tipo} onChange={(e) => setVehForm({ ...vehForm, tipo: e.target.value })}>
                <option value="Bicicleta">Bicicleta</option>
                <option value="Electrica">Bici Eléctrica</option>
                <option value="Scooter electrico">Scooter Eléctrico</option>
                <option value="Patines">Patines</option>
              </select>
            </div>
            <div className="admin-input-group"><label>Precio por minuto ($)</label><input type="number" step="0.1" placeholder="Ej. 1.5" value={vehForm.precioPorMinuto} onChange={(e) => setVehForm({ ...vehForm, precioPorMinuto: e.target.value })}/></div>
            <button className="admin-btn-save" type="button" onClick={guardarVehiculo}><i className="bx bx-plus-circle"></i> Registrar Vehículo</button>
          </div>

          {/* GESTIONAR USUARIOS */}
          <div className="admin-section-box admin-full-width">
            <h3><i className="bx bxs-user-detail"></i> Gestionar Usuarios</h3>
            <div className="admin-vehicle-list">
              {usuarios.length === 0 ? (
                <p className="admin-empty">No hay usuarios registrados todavía.</p>
              ) : (
                usuarios.map((u) => (
                  <div key={u._id} className="admin-item">
                    <div className="admin-item-info">
                      <strong>{u.nombre} {u.apellido}</strong> — {u.rol === 'admin' ? '⭐ Admin' : 'Vaquero'}
                      <span className="admin-item-sub">
                        <i className="bx bxs-envelope"></i> {u.correo} &nbsp;·&nbsp; País: {u.pais}
                      </span>
                    </div>
                    {/* Evitamos que el admin se elimine a sí mismo por accidente */}
                    {u.rol !== 'admin' && (
                      <button
                        className="admin-btn-delete"
                        type="button"
                        onClick={() => eliminarUsuario(u._id)}
                      >
                        <i className="bx bx-trash"></i> Expulsar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GESTIONAR VEHÍCULOS */}
          <div className="admin-section-box admin-full-width">
            <h3><i className="bx bxs-car-garage"></i> Gestionar Vehículos</h3>
            <div className="admin-vehicle-list">
              {vehiculos.length === 0 ? (
                <p className="admin-empty">No hay vehículos registrados todavía.</p>
              ) : (
                vehiculos.map((v) => (
                  <div key={v._id} className="admin-item">
                    <div className="admin-item-info">
                      <strong>{v.codigoVehiculo} · {v.tipo}</strong>
                      <span className="admin-item-sub">
                        Estado: {v.estado} &nbsp;·&nbsp; Batería: {v.bateria ?? 0}% &nbsp;·&nbsp; ${v.precioPorMinuto}/min
                      </span>
                      <span className="admin-item-sub">
                        Estación: {v.estacionActual?.nombre || "Sin estación"}
                      </span>
                    </div>
                    <button className="admin-btn-edit" type="button"
                      onClick={() => abrirEditarVehiculo(v)}>
                      <i className="bx bxs-edit"></i> Editar
                    </button>
                    <button
                      className="admin-btn-delete"
                      type="button"
                      onClick={() => eliminarVehiculo(v._id)}
                    >
                      <i className="bx bx-trash"></i> Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GESTIONAR ESTACIONES */}
          <div className="admin-section-box admin-full-width">
            <h3><i className="bx bxs-map"></i> Gestionar estaciones</h3>
            <div className="admin-vehicle-list">
              {estaciones.length === 0 ? (
                <p className="admin-empty">No hay estaciones registradas todavía.</p>
              ) : (
                estaciones.map((e) => (
                  <div key={e._id} className="admin-item">
                    <div className="admin-item-info">
                      <strong>{e.nombre}</strong>
                      <span className="admin-item-sub">
                        Capacidad máxima: {e.capacidadMaxima}
                      </span>
                      <span className="admin-item-sub">
                        Coordenadas: ({e.coordenadas?.lat}, {e.coordenadas?.lng})
                      </span>
                    </div>
                    <button className="admin-btn-edit" type="button"
                      onClick={() => abrirEditarEstacion(e)}>
                      <i className="bx bxs-edit"></i> Editar
                    </button>
                    <button
                      className="admin-btn-delete"
                      type="button"
                      onClick={() => eliminarEstacion(e._id)}
                    >
                      <i className="bx bx-trash"></i> Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECCIÓN DE REPORTES */}
          <div className="admin-section-box admin-full-width">
            <h3><i className="bx bxs-report"></i> Reportes del Sistema</h3>
            
            {/* BOTONES */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              {[
                { key: "historial-rentas", label: "Historial Rentas" },
                { key: "incidentes-pendientes", label: "Incidentes" },
                { key: "ingresos-transacciones", label: "Ingresos" },
                { key: "ocupacion-estaciones", label: "Ocupación" }
              ].map(({ key, label }) => (
                <button key={key} className={`admin-btn-save ${reporteActivo === key ? "" : ""}`}
                  style={{ width: "auto", background: reporteActivo === key ? "#2f5f58" : undefined }}
                  onClick={() => verReporte(key)}>
                  {label}
                </button>
              ))}
              {reporteActivo && (
                <button className="admin-btn-close" style={{ width: "auto" }}
                  onClick={() => { setReporteActivo(null); setDatosReporte([]); }}>
                  Cerrar
                </button>
              )}
            </div>

            {/* RESUMEN */}
            {reporteActivo && datosReporte.length > 0 && (
              <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>

                {reporteActivo === "historial-rentas" && (<>
                  <div className="admin-stat-card">
                    <span>Total rentas</span><strong>{datosReporte.length}</strong>
                  </div>
                  <div className="admin-stat-card">
                    <span>Completadas</span><strong>{datosReporte.filter(r => r.estado === "Completada").length}</strong>
                  </div>
                  <div className="admin-stat-card">
                    <span>Ingresos totales</span><strong>${datosReporte.reduce((acc, r) => acc + (r.costoTotal || 0), 0).toFixed(2)}</strong>
                  </div>
                </>)}

                {reporteActivo === "incidentes-pendientes" && (<>
                  <div className="admin-stat-card">
                    <span>Incidentes pendientes</span><strong>{datosReporte.length}</strong>
                  </div>
                  <div className="admin-stat-card">
                    <span>Vehículos afectados</span><strong>{new Set(datosReporte.map(r => r.vehiculo?._id)).size}</strong>
                  </div>
                </>)}

                {reporteActivo === "ingresos-transacciones" && (<>
                  <div className="admin-stat-card">
                    <span>Total transacciones</span><strong>{datosReporte.length}</strong>
                  </div>
                  <div className="admin-stat-card">
                    <span>Ingresos totales</span><strong>${datosReporte.reduce((acc, r) => acc + (r.monto || 0), 0).toFixed(2)}</strong>
                  </div>
                </>)}

                {reporteActivo === "ocupacion-estaciones" && (<>
                  <div className="admin-stat-card">
                    <span>Vehículos en estación</span><strong>{datosReporte.length}</strong>
                  </div>
                  <div className="admin-stat-card">
                    <span>Estaciones ocupadas</span><strong>{new Set(datosReporte.map(r => r.estacionActual?._id)).size}</strong>
                  </div>
                </>)}

              </div>
            )}

            {/* TABLAS */}
            {!reporteActivo && <p className="admin-empty">Selecciona un reporte para visualizarlo.</p>}
            {reporteActivo && datosReporte.length === 0 && <p className="admin-empty">No hay datos para este reporte.</p>}

            {reporteActivo === "historial-rentas" && datosReporte.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr>
                    <th>Usuario</th><th>Correo</th><th>Vehículo</th><th>Tipo</th><th>Costo total</th><th>Estado</th>
                  </tr></thead>
                  <tbody>
                    {datosReporte.map((r, i) => (
                      <tr key={i}>
                        <td>{r.usuario?.nombre || "—"}</td>
                        <td>{r.usuario?.correo || "—"}</td>
                        <td>{r.vehiculo?.codigoVehiculo || "—"}</td>
                        <td>{r.vehiculo?.tipo || "—"}</td>
                        <td>${(r.costoTotal || 0).toFixed(2)}</td>
                        <td>{r.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reporteActivo === "incidentes-pendientes" && datosReporte.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr>
                    <th>Descripción</th><th>Vehículo</th><th>Tipo</th><th>Reportado por</th><th>Correo</th>
                  </tr></thead>
                  <tbody>
                    {datosReporte.map((r, i) => (
                      <tr key={i}>
                        <td>{r.descripcion || "—"}</td>
                        <td>{r.vehiculo?.codigoVehiculo || "—"}</td>
                        <td>{r.vehiculo?.tipo || "—"}</td>
                        <td>{r.reportadoPor?.nombre || "—"}</td>
                        <td>{r.reportadoPor?.correo || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reporteActivo === "ingresos-transacciones" && datosReporte.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr>
                    <th>Usuario</th><th>Correo</th><th>Tipo</th><th>Monto</th><th>Fecha</th>
                  </tr></thead>
                  <tbody>
                    {datosReporte.map((r, i) => (
                      <tr key={i}>
                        <td>{r.usuarioID?.nombre || "—"}</td>
                        <td>{r.usuarioID?.correo || "—"}</td>
                        <td>{r.tipo || "—"}</td>
                        <td>${(r.monto || 0).toFixed(2)}</td>
                        <td>{new Date(r.fecha).toLocaleDateString("es-MX")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reporteActivo === "ocupacion-estaciones" && datosReporte.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead><tr>
                    <th>Vehículo</th><th>Tipo</th><th>Estación</th><th>Capacidad máx.</th><th>Estado estación</th>
                  </tr></thead>
                  <tbody>
                    {datosReporte.map((r, i) => (
                      <tr key={i}>
                        <td>{r.codigoVehiculo || "—"}</td>
                        <td>{r.tipo || "—"}</td>
                        <td>{r.estacionActual?.nombre || "—"}</td>
                        <td>{r.estacionActual?.capacidadMaxima || "—"}</td>
                        <td>{r.estacionActual?.estado || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* MODAL EDITAR ESTACIÓN */}
          {showEditEstModal && (
            <div className="modal active" style={{ display: "grid" }} onClick={(e) => { if (e.target === e.currentTarget) setShowEditEstModal(false); }}>
              <div className="modal-box">
                <h3>Editar Estación</h3>
                <input className="mod-input" type="text" placeholder="Nombre"
                  value={editEst.nombre}
                  onChange={(e) => setEditEst({ ...editEst, nombre: e.target.value })}
                />
                <input className="mod-input" type="number" placeholder="Capacidad máxima"
                  value={editEst.capacidadMaxima}
                  onChange={(e) => setEditEst({ ...editEst, capacidadMaxima: e.target.value })}
                />
                <div className="mod-btns">
                  <button className="btn-save" type="button" onClick={guardarEditEstacion}>Guardar</button>
                  <button className="btn-close" type="button" onClick={() => setShowEditEstModal(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL EDITAR VEHÍCULO */}
          {showEditVehModal && (
            <div className="modal active" style={{ display: "grid" }} onClick={(e) => { if (e.target === e.currentTarget) setShowEditVehModal(false); }}>
              <div className="modal-box">
                <h3>Editar Vehículo</h3>
                <input className="mod-input" type="number" placeholder="Precio por minuto" step="0.1"
                  value={editVeh.precioPorMinuto}
                  onChange={(e) => setEditVeh({ ...editVeh, precioPorMinuto: e.target.value })}
                />
                <select className="mod-input"
                  value={editVeh.estado}
                  onChange={(e) => setEditVeh({ ...editVeh, estado: e.target.value })}>
                  <option value="Disponible">Disponible</option>
                  <option value="En uso">En uso</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
                <select className="mod-input"
                  value={editVeh.estacionActual}
                  onChange={(e) => setEditVeh({ ...editVeh, estacionActual: e.target.value })}>
                  <option value="">Selecciona una estación</option>
                  {estaciones.map((est) => (
                    <option key={est._id} value={est._id}>{est.nombre}</option>
                  ))}
                </select>
                <div className="mod-btns">
                  <button className="btn-save" type="button" onClick={guardarEditVehiculo}>Guardar</button>
                  <button className="btn-close" type="button" onClick={() => setShowEditVehModal(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <div className={`admin-toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}

export default Admin;