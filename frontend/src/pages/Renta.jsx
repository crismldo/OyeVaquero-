import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import "./Renta.css";

const RENTA_TRIP_STORAGE_KEY = "renta-active-trip";
const PERFIL_WALLET_STORAGE_KEY = "perfil-wallet-methods";
const money = (value) => `$${value.toFixed(2)} MXN`;

const getAuthHeaders = (withContent = false) => {
  const token = localStorage.getItem("token");
  return {
    ...(withContent && { "Content-Type": "application/json" }),
    "Authorization": `Bearer ${token}`
  };
  
};

function Renta() {
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState("map");
  const [stations, setStations] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);
  const [tripStartedAt, setTripStartedAt] = useState(null);
  const [tripElapsed, setTripElapsed] = useState(0);
  const [toast, setToast] = useState("");

  // --- Wallet ---

  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("new"); // "new" por defecto para agregar otra
  const [guardarTarjeta, setGuardarTarjeta] = useState(false);
  
  const [activeMarker, setActiveMarker] = useState(null); // estación cuyo InfoWindow está abierto

  // --- ESTADOS NUEVOS PARA PAGOS ---
  const [payment, setPayment] = useState({ holder: "", card: "", exp: "", alias: "", cvv: "", terms: false });

  const showToast = (msg) => { setToast(msg); window.setTimeout(() => setToast(""), 3000); };
  const goTo = (nextStep) => { setStep(nextStep); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const cargarDatos = useCallback(async () => {
    setLoadingMap(true);
    try {
      const headers = getAuthHeaders();

      const [resEstaciones, resVehiculos, resTarjetas] = await Promise.all([
        fetch("http://localhost:5000/api/estaciones", { headers }),
        fetch("http://localhost:5000/api/vehiculos", { headers }),
        fetch("http://localhost:5000/api/usuarios/metodos-pago", { headers })
      ]);

      if (resEstaciones.status === 401) return navigate("/login");

      // Cargar tarjetas guardadas
      if (resTarjetas.ok) {
        const tarjetas = await resTarjetas.json();
        setSavedCards(Array.isArray(tarjetas) ? tarjetas : []);
      } else {
        setSavedCards([]);
      }

      const estacionesData = await resEstaciones.json();
      const vehiculosData = await resVehiculos.json();

      // Verificar renta activa
      const resRentaActiva = await fetch("http://localhost:5000/api/rentas/activa", { headers });
      if (resRentaActiva.ok) {
        const rentaActiva = await resRentaActiva.json();
        if (rentaActiva) {
          setPaidOrder({ id: rentaActiva._id, serial: rentaActiva.vehiculo?.codigoVehiculo, station: rentaActiva.estacionOrigen?.nombre, total: 0 });
          setTripStartedAt(new Date(rentaActiva.fechaInicio).getTime());
          goTo("trip");
        }
      }

      const lats = estacionesData.map(e => e.coordenadas.lat);
      const lngs = estacionesData.map(e => e.coordenadas.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

      const stationsMapped = estacionesData.map((est) => ({
        id: est._id,
        name: est.nombre,
        line: `Capacidad: ${est.capacidadMaxima}`,
        lat: est.coordenadas.lat,
        lng: est.coordenadas.lng,
        vehicles: vehiculosData
          .filter((v) => v.estacionActual && v.estacionActual._id === est._id && v.estado === "Disponible")
          .map((v) => ({ id: v._id, type: v.tipo, serial: v.codigoVehiculo, price30: v.precioPorMinuto * 30, precioReal: v.precioPorMinuto }))
      }));

      setStations(stationsMapped);
    } catch (error) {
      showToast("Error al conectar con el servidor.");
    } finally {
      setLoadingMap(false);
    }
  }, [navigate]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY
  });
  
  const mapCenter = { lat: 25.6772, lng: -100.3095 }; // Centro de Monterrey
  const mapContainerStyle = { width: "100%", height: "100%" };
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] }
    ]
  };

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // TIMER Y PERSISTENCIA
  useEffect(() => {
    if (!tripStartedAt) return undefined;
    const tick = () => setTripElapsed(Math.floor((Date.now() - tripStartedAt) / 1000));
    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [tripStartedAt]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(RENTA_TRIP_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved?.tripStartedAt || !saved?.paidOrder) return;
      setSelectedStation(saved.selectedStation);
      setSelectedVehicle(saved.selectedVehicle);
      setPaidOrder(saved.paidOrder);
      setTripStartedAt(saved.tripStartedAt);
      setStep("trip");
    } catch { window.sessionStorage.removeItem(RENTA_TRIP_STORAGE_KEY); }
  }, []);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("resumeTrip") === "1") {
      const raw = window.sessionStorage.getItem(RENTA_TRIP_STORAGE_KEY);
      if (!raw) return;

      try {
        const saved = JSON.parse(raw);
        if (!saved?.tripStartedAt || !saved?.paidOrder) return;
        setSelectedStation(saved.selectedStation || null);
        setSelectedVehicle(saved.selectedVehicle || null);
        setPaidOrder(saved.paidOrder || null);
        setTripStartedAt(saved.tripStartedAt);
        goTo("trip");
      } catch {
        window.sessionStorage.removeItem(RENTA_TRIP_STORAGE_KEY);
      }
      return;
    }

    // Permite abrir vistas especificas desde Perfil.
    if (params.get("from") !== "perfil") return;

    const focus = params.get("focus");
    if (focus === "pago") {
      setStep("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setToast("Completa tus datos para continuar con el pago.");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }

    if (focus === "estaciones") {
      setStep("map");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setToast("Selecciona una estacion y un vehiculo para continuar.");
      window.setTimeout(() => setToast(""), 2200);
    }
  }, [location.search]);

  const qrUrl = useMemo(() => {
    if (!paidOrder) return "";
    const payload = `${paidOrder.id}|${paidOrder.serial}|${paidOrder.station}|${paidOrder.total}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }, [paidOrder]);

  const tripTimeLabel = useMemo(() => {
    const mm = String(Math.floor(tripElapsed / 60)).padStart(2, "0");
    const ss = String(tripElapsed % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [tripElapsed]);

  const onPaymentChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPayment((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onChooseVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    showToast(`Vehiculo ${vehicle.type} seleccionado.`);
  };

  const saveTripState = () => {
    if (!selectedStation || !selectedVehicle || !paidOrder || !tripStartedAt) return;
    window.sessionStorage.setItem(
      RENTA_TRIP_STORAGE_KEY,
      JSON.stringify({ selectedStation, selectedVehicle, paidOrder, tripStartedAt })
    );
  };

  const validarExpiracion = (exp) => {
    if (!/^\d{2}\/\d{2}$/.test(exp)) return false;
    const [mm, yy] = exp.split('/').map(Number);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const currentYear = parseInt(now.getFullYear().toString().slice(-2));
    const currentMonth = now.getMonth() + 1;
    if (yy < currentYear) return false;
    if (yy === currentYear && mm < currentMonth) return false;
    return true;
  };

  //------ PROCESAR PAGO ------
  const procesarPago = async (event) => {
    event.preventDefault();

    // 1. Validar CVV
    const cvvLimpio = payment.cvv.trim();
    if (cvvLimpio.length < 3 || isNaN(cvvLimpio) || cvvLimpio === "000") {
      return showToast("CVV inválido (deben ser 3 o 4 números).");
    }

    // 2. Validar tarjeta nueva
    if (selectedCardId === "new") {
      if (!payment.holder.trim()) return showToast("Ingresa el nombre del titular.");
      
      const cardClean = payment.card.replace(/\s/g, "");
      if (cardClean.length < 15 || isNaN(cardClean) || cardClean.length > 16) {
        return showToast("Número de tarjeta inválido. Revisa los dígitos.");
      }
      if (!validarExpiracion(payment.exp)) {
        return showToast("Fecha de expiración inválida o tarjeta vencida (Usa MM/AA).");
      }

      // 3. Guardar tarjeta si marcó el checkbox
      if (guardarTarjeta) {
        if (!payment.alias.trim()) return showToast("Agrega un alias para identificar tu tarjeta.");
        try {
          const res = await fetch("http://localhost:5000/api/usuarios/metodos-pago", {
            method: "POST", headers: getAuthHeaders(true),
            body: JSON.stringify({ 
              numeroTarjeta: cardClean, 
              expiracion: payment.exp,
              alias: payment.alias.trim(),
              titular: payment.holder.trim()
            })
          });
          const data = await res.json();
          if (res.ok) {
            showToast("Tarjeta guardada con éxito.");
          } else {
            showToast(data.message || "No se pudo guardar la tarjeta.");
          }
        } catch (error) {
          console.error("Error guardando tarjeta:", error);
        }
      }
    }

    const now = new Date();
    setPaidOrder({
      id: `RV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
      station: selectedStation.name,
      vehicleType: selectedVehicle.type,
      serial: selectedVehicle.serial,
      total: selectedVehicle.price30,
      paidAt: now
    });
    goTo("ticket");
  };

  // --- INICIAR VIAJE ---
  const onStartTrip = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/rentas/iniciar", {
        method: "POST", 
        headers: getAuthHeaders(true), 
        body: JSON.stringify({ 
          vehiculoId: selectedVehicle.id,
          estacionOrigenId: selectedStation.id
        })
      });
      const data = await res.json();

      if (res.ok) {
        const startedAt = Date.now();
        localStorage.setItem("rentaActivaId", data.renta._id);
        setTripStartedAt(startedAt);

        // Actualizamos paidOrder con el ID real de la renta del backend
        setPaidOrder(prev => ({ ...prev, rentaId: data.renta._id }));

        window.sessionStorage.setItem(RENTA_TRIP_STORAGE_KEY, JSON.stringify({ 
          selectedStation, 
          selectedVehicle, 
          paidOrder: { ...paidOrder, rentaId: data.renta._id }, 
          tripStartedAt: startedAt 
        }));
        goTo("trip");
        showToast("¡Viaje iniciado! Vehículo desbloqueado.");
      } else {
        console.log("Status:", res.status);
        console.log("Data completa:", data);
        alert(`🚨 ATENCIÓN: ${data.message || JSON.stringify(data)}`);
        if (res.status === 403) navigate("/perfil");
      }
    } catch (error) { 
      showToast("Error al comunicarse con el servidor."); 
    }
  };

  // --- PARAR VIAJE ---
  const onStopTrip = async (fueraDeEstacion = false) => {
    const rentaId = paidOrder?.rentaId || localStorage.getItem("rentaActivaId");

    if (!rentaId) {
      showToast("Error: no se encontró la renta activa.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/rentas/finalizar/${rentaId}`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ fueraDeEstacion })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Viaje finalizado. Duración: ${data.tiempo}. Total: $${data.total.toFixed(2)} MXN${data.nota ? ` — ${data.nota}` : ''}`);
        localStorage.removeItem("rentaActivaId");
      } else {
        showToast(`Error al finalizar: ${data.message || data.error}`);
        return; // No limpies el estado si falló
      }
    } catch (error) {
      showToast("Error de conexión al finalizar el viaje.");
      return;
    }

    setTripStartedAt(null);
    setTripElapsed(0);
    setPaidOrder(null);
    setSelectedVehicle(null);
    setSelectedStation(null);
    window.sessionStorage.removeItem(RENTA_TRIP_STORAGE_KEY);
    await cargarDatos();
    goTo("map");
  };

  return (
    <div className="renta-page">
      <main className="renta-main">
        {step === "map" && (
          <section className="renta-step is-active">
            <div className="renta-container">
              <p className="renta-kicker">Paso 1</p>
              <div className="renta-dashboard">
                <aside className="renta-left-column">
                  <article className="renta-card renta-summary-inline">
                    <div className="renta-summary-head">
                      <h2>Resumen de compra</h2>
                      <p><strong>Estacion seleccionada:</strong> {selectedStation ? selectedStation.name : "Ninguna aun"}</p>
                      <p><strong>Vehiculo:</strong> {selectedVehicle ? selectedVehicle.type : "-"}</p>
                      <p><strong>Serie:</strong> {selectedVehicle ? selectedVehicle.serial : "-"}</p>
                      <p><strong>Costo (30 min):</strong> {selectedVehicle ? money(selectedVehicle.price30) : "-"}</p>
                      <button type="button" className="renta-btn renta-btn-primary renta-pay-btn" disabled={!selectedStation || !selectedVehicle} onClick={() => goTo("payment")}>Continuar con el pago</button>
                    </div>

                    <section className="renta-vehicles-panel renta-vehicles-panel-side renta-summary-catalog">
                      <h2>Catalogo de vehiculos</h2>
                      <div className="renta-catalog-options">
                        {selectedStation ? (
                          <div className="renta-vehicle-grid">
                            {selectedStation.vehicles.map((v) => (
                              <article key={v.id} className={`renta-vehicle-card ${selectedVehicle?.id === v.id ? "selected" : ""}`}>
                                <h3>{v.type}</h3>
                                <p><strong>Serie:</strong> {v.serial}</p>
                                <p><strong>Costo:</strong> {money(v.price30)}</p>
                                <button type="button" className="renta-btn renta-btn-primary" onClick={() => onChooseVehicle(v)}>Elegir</button>
                              </article>
                            ))}
                          </div>
                        ) : <p>Primero selecciona una estacion en el mapa.</p>}
                      </div>
                    </section>
                  </article>
                </aside>

                <section className="renta-map-stage">
                  <h1>Selecciona ubicacion y vehiculo</h1>
                  <div className="renta-metro-map">
                  {loadingMap || !isLoaded ? (
                    <p style={{ padding: "20px" }}>Cargando mapa...</p>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={14}
                      options={mapOptions}
                    >
                      {stations.map((station) => (
                        <Marker
                          key={station.id}
                          position={{ lat: station.lat, lng: station.lng }}
                          title={station.name}
                          onClick={() => {
                            setSelectedStation(station);
                            setSelectedVehicle(null);
                            setActiveMarker(station.id);
                          }}
                        >
                          {activeMarker === station.id && (
                            <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                              <div style={{ fontSize: "0.85rem", color: "#2f2419" }}>
                                <strong>{station.name}</strong>
                                <p style={{ margin: "4px 0 0" }}>
                                  {station.vehicles.length > 0
                                    ? `${station.vehicles.length} vehículo(s) disponible(s)`
                                    : "Sin vehículos disponibles"}
                                </p>
                              </div>
                            </InfoWindow>
                          )}
                        </Marker>
                      ))}
                    </GoogleMap>
                  )}
                </div>
                </section>
              </div>
            </div>
          </section>
        )}

        {step === "payment" && (
        <section className="renta-step is-active" aria-labelledby="payment-title">
        <div className="renta-container renta-container-narrow">
        <p className="renta-kicker">Paso 2</p>
        <h2 id="payment-title" className="rye-font">Pago Seguro</h2>

      <form className="renta-card renta-payment-form" onSubmit={procesarPago}>
        
        {/* SELECTOR DE MODO DE PAGO */}
        {savedCards.length > 0 && (
          <label>
            Selecciona tu método de pago
            <select 
              className="mod-input" 
              style={{ border: '1px solid #b88642' }}
              value={selectedCardId} 
              onChange={(e) => setSelectedCardId(e.target.value)}
            >
              <option value="new">➕ Agregar otra tarjeta</option>
              {savedCards.map(c => (
                <option key={c._id} value={c._id}>💳 {c.marca} **** {c.ultimos4} (Exp: {c.expiracion})</option>
              ))}
            </select>
          </label>
        )}

        {/* CAMPOS PARA TARJETA NUEVA: Solo se ven si elige "new" */}
        {selectedCardId === "new" && (
          <>
            <label>Nombre del titular<input name="holder" required placeholder="Como aparece en el plástico" value={payment.holder} onChange={onPaymentChange} /></label>
            <div className="renta-cols-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label>Número de Tarjeta<input name="card" required placeholder="0000 0000 0000 0000" maxLength={19} value={payment.card} onChange={onPaymentChange} /></label>
              <label>Vencimiento<input name="exp" required placeholder="MM/AA" maxLength={5} value={payment.exp} onChange={onPaymentChange} /></label>
            </div>
            <label className="renta-check">
              <input type="checkbox" checked={guardarTarjeta} onChange={(e) => setGuardarTarjeta(e.target.checked)} />
              🔒 Guardar esta tarjeta en mi Wallet para futuros viajes
            </label>

            {guardarTarjeta && (
              <label>Alias (para identificarla en tu Wallet)
                <input name="alias" placeholder="Ej: Nómina" value={payment.alias} onChange={onPaymentChange} />
              </label>
            )}
          </>
        )}

        {/* CVV: Siempre se pide, incluso para tarjetas guardadas */}
        <div style={{ width: '120px' }}>
          <label>CVV<input name="cvv" required type="password" inputMode="numeric" maxLength={4} placeholder="***" value={payment.cvv} onChange={onPaymentChange} /></label>
        </div>

        <label className="renta-check" style={{ marginTop: '10px' }}>
          <input type="checkbox" name="terms" required checked={payment.terms} onChange={onPaymentChange} />
          Acepto los términos y condiciones de renta
        </label>
        
        <button className="renta-btn renta-btn-primary" type="submit">Validar Pago y Generar Ticket</button>
      </form>

      <div className="renta-actions-row">
        <button className="renta-btn renta-btn-ghost" type="button" onClick={() => goTo("map")}>Regresar al mapa</button>
      </div>
    </div>
  </section>
)}


        {/* PASO 3 Y 4 SE MANTIENEN IGUAL (Tickets y Timer) */}
        {step === "ticket" && paidOrder && (
          <section className="renta-step is-active">
            <div className="renta-container renta-container-narrow">
              <h2 id="ticket-title">Ticket generado</h2>
              <article className="renta-ticket">
                <p>Folio: {paidOrder.id}</p>
                <div className="renta-qr-wrap"><img src={qrUrl} alt="QR" /></div>
              </article>
              <div className="renta-actions-row renta-actions-ticket">
                <button className="renta-btn renta-btn-primary" type="button" onClick={onStartTrip}>Iniciar viaje</button>
              </div>
            </div>
          </section>
        )}

        {step === "trip" && paidOrder && (
          <section className="renta-step is-active">
            <div className="renta-container renta-container-narrow">
              <h2>Viaje activo</h2>
              <article className="renta-card">
                <div className="renta-timer">{tripTimeLabel}</div>
              </article>
              <div className="renta-trip-actions">
                <button className="renta-btn renta-btn-primary" style={{background: '#3f7069', color: 'white'}} type="button" onClick={() => onStopTrip(false)}>
                  <i className='bx bx-check-shield'></i> Dejar en Estación
                </button>
                <button className="renta-btn renta-btn-danger" type="button" onClick={() => onStopTrip(true)}>
                  <i className='bx bx-error-circle'></i> Abandonar en la calle
                </button>
                <Link className="renta-btn renta-btn-ghost" to="/manual" onClick={saveTripState}>Obtener ayuda</Link>
                <button className="renta-btn renta-btn-ghost" type="button" onClick={() => showToast("Soporte: 55-1234-5678")}>Soporte</button>
              </div>
            </div>
          </section>
        )}
      </main>
      <div className={`renta-toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}

export default Renta;