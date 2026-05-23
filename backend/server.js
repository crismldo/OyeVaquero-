const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require('fs');

// ------ IMPORTACIONES DE MODELOS ------
const User = require("./Models/Usuario.js");
const Vehiculo = require("./Models/Vehiculos.js"); 
const Renta = require("./Models/RentaVehiculo.js"); 
const Estacion = require("./Models/Estaciones.js");
const Incidente = require("./Models/Incidentes.js"); 
const Transaccion = require("./Models/Transacciones.js"); 

const app = express();
app.use(cors()); 
app.use(express.json());

// ------ FUNCIÓN DE LOGS ------
const registrarLog = (mensaje) => {
  const logMensaje = `[${new Date().toLocaleString()}] - ${mensaje}\n`;
  fs.appendFileSync('backend_critical.log', logMensaje);
};

// ------ CREAR ADMIN AUTOMÁTICAMENTE ------
const crearAdminHardcoded = async () => {
  try {
    const adminEmail = "admin@vueltavaquera.com";
    const adminExiste = await User.findOne({ correo: adminEmail });

    if (!adminExiste) {
      const hashedPassword = await bcrypt.hash("Admin123!", 10);
      const nuevoAdmin = new User({
        nombre: "Fernanda",
        apellido: "Admin",
        fechaNacimiento: new Date(2000, 0, 1),
        pais: "México",
        correo: adminEmail,
        password: hashedPassword,
        rol: "admin" 
      });
      await nuevoAdmin.save();
      registrarLog("Sistema: Usuario Admin maestro creado exitosamente.");
      console.log("¡Usuario Admin hardcoded listo! (admin@vueltavaquera.com)");
    }
  } catch (error) {
    registrarLog(`Error creando admin: ${error.message}`);
  }
};

// ------ CONEXIÓN A LA BD ------
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    registrarLog('Conexión exitosa a MongoDB');
    console.log('¡Base de datos conectada exitosamente!');
    crearAdminHardcoded();
  })
  .catch((error) => {
    registrarLog(`Error de conexión a BD: ${error.message}`);
    console.error('Error al conectar con la base de datos:', error);
});

// ------ MIDDLEWARES DE SEGURIDAD ------
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  if (!token) {
    registrarLog('Intento de acceso sin token');
    return res.status(403).json({ message: "Token de acceso requerido" });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'firma_secreta_proyectoweb2', (err, decoded) => {
    if (err) {
      registrarLog('Token inválido o expirado');
      return res.status(401).json({ message: "Token inválido" });
    }
    req.user = decoded;
    next();
  });
};

const verificarAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    registrarLog(`Intento de acceso denegado a zona Admin por ID: ${req.user.id}`);
    return res.status(403).json({ message: "Acceso denegado: Se requieren permisos de administrador." });
  }
};

// ------ USUARIOS ------

app.post("/api/register", async (req, res) => {
  try {
    const { nombre, apellido, pais, fechaNacimiento, correo, password } = req.body;

    const campos = { nombre, apellido, pais, fechaNacimiento, correo, password };
    for (const [key, value] of Object.entries(campos)) {
    if (!value || !String(value).trim()) {
        return res.status(400).json({ message: `El campo ${key} es obligatorio` });
    }
    }

    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(nombre) || !nombreRegex.test(apellido) || !nombreRegex.test(pais)) {
      return res.status(400).json({ message: "El nombre, apellido y pais solo pueden contener letras." });
    }

    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!correoRegex.test(correo.trim())) {
    return res.status(400).json({ message: "Correo electrónico no válido" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: "La contraseña no cumple los requisitos de seguridad" });
    }

    // 4. Sanitizar strings antes de guardar
    const nombreLimpio = nombre.trim();
    const apellidoLimpio = apellido.trim();
    const paisLimpio = pais.trim();
    const correoLimpio = correo.trim().toLowerCase();

    const existingUser = await User.findOne({ correo: correoLimpio });

    if (existingUser) return res.status(400).json({ message: "Este correo ya está registrado" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
        nombre: nombreLimpio, 
        apellido: apellidoLimpio, 
        fechaNacimiento, 
        pais: paisLimpio, 
        correo: correoLimpio,
        password: hashedPassword 
    });
    
    await newUser.save();
    registrarLog(`Evento Crítico: Nuevo usuario registrado (${correo})`);
    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (error) {
    registrarLog(`Excepción en Registro: ${error.message}`);
    res.status(500).json({ message: "Error del servidor" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { correo, password } = req.body;
    const user = await User.findOne({ correo });

    if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET || 'firma_secreta_proyectoweb2', { expiresIn: '2h' });
    registrarLog(`Evento Crítico: Login exitoso del usuario ${correo}`);

    res.status(200).json({
      message: "Login exitoso",
      token, 
      user: { id: user._id, nombre: user.nombre, correo: user.correo, rol: user.rol }
    });
  } catch (error) {
    registrarLog(`Excepción en Login: ${error.message}`);
    res.status(500).json({ message: "Error del servidor" });
  }
});

app.get("/api/usuarios", verificarToken, async (req, res) => {
  try {
    const usuarios = await User.find().select('-password'); 
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

// ------  METODOS DE PAGO ------
app.get("/api/usuarios/metodos-pago", verificarToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    
    const tarjetasSeguras = (usuario.metodosPago || []).map(t => ({
        _id: t._id,
        ultimos4: t.ultimos4,
        marca: t.marca,
        expiracion: t.expiracion,
        alias: t.alias,
        titular: t.titular
    }));
    
    res.json(tarjetasSeguras);
  } catch (error) {
    console.log("Error en GET tarjetas:", error);
    res.status(500).json({ message: "Error al obtener métodos de pago" });
  }
});

app.post("/api/usuarios/metodos-pago", verificarToken, async (req, res) => {
  try {
    const { numeroTarjeta, expiracion, alias, titular } = req.body;

    if (!numeroTarjeta || !expiracion || !alias?.trim() || !titular?.trim()) {
    return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    const digitsOnly = numeroTarjeta.replace(/\D/g, "");
    if (digitsOnly.length < 15 || digitsOnly.length > 16) {
      return res.status(400).json({ message: "Número de tarjeta inválido." });
    }

    const expRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expRegex.test(expiracion)) {
      return res.status(400).json({ message: "Formato de expiración inválido. Usa MM/AA." });
    }

    const [mes, anio] = expiracion.split("/");
    const expDate = new Date(2000 + parseInt(anio), parseInt(mes) - 1, 1);
    if (expDate < new Date()) {
      return res.status(400).json({ message: "La tarjeta está vencida." });
    }

    // Detectar marca automáticamente
    let marca = "Desconocida";
    if (digitsOnly.startsWith("4")) marca = "Visa";
    else if (digitsOnly.startsWith("5")) marca = "Mastercard";
    else if (digitsOnly.startsWith("3")) marca = "Amex";

    const ultimos4 = digitsOnly.slice(-4);
    const tarjetaEncriptada = await bcrypt.hash(digitsOnly, 10);

    const usuario = await User.findById(req.user.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!Array.isArray(usuario.metodosPago)) usuario.metodosPago = [];

    // Verificar que no esté duplicada
    const duplicada = usuario.metodosPago.some(t => t.ultimos4 === ultimos4 && t.marca === marca && t.expiracion === expiracion);
    if (duplicada) return res.status(400).json({ message: "Esta tarjeta ya está guardada." });

    usuario.metodosPago.push({ ultimos4, marca, expiracion, alias: alias.trim(), titular: titular.trim(), tarjetaEncriptada });
    await usuario.save();

    registrarLog(`Evento: Usuario ${usuario.correo} guardó un nuevo método de pago`);
    res.status(201).json({ message: "Tarjeta guardada con seguridad" });
  } catch (error) {
    console.log("Error en POST tarjetas:", error);
    res.status(500).json({ message: "Error al guardar tarjeta" });
  }
});

//------ GETS BASICOS ------
app.get("/api/estaciones", verificarToken, async (req, res) => {
  try {
    const estaciones = await Estacion.find(); 
    res.json(estaciones); 
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las estaciones" });
  }
});
app.get("/api/incidentes", verificarToken, async (req, res) => {
  try {
    const incidentes = await Incidente.find().populate('vehiculo').populate('reportadoPor');
    res.json(incidentes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener incidentes" });
  }
});

app.get("/api/vehiculos", verificarToken, async (req, res) => {
  try {
    const vehiculos = await Vehiculo.find().populate('estacionActual'); 
    res.json(vehiculos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los vehículos" });
  }
});

app.get("/api/transacciones", verificarToken, async (req, res) => {
  try {
    const transacciones = await Transaccion.find().populate('usuarioID'); 
    res.json(transacciones);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener transacciones" });
  }
});

app.get("/api/rentas/activa", verificarToken, async (req, res) => {
  try {
    const renta = await Renta.findOne({ usuario: req.user.id, estado: "Activa" })
      .populate("vehiculo", "codigoVehiculo tipo")
      .populate("estacionOrigen", "nombre");
    res.json(renta || null);
  } catch (error) {
    res.status(500).json({ message: "Error al verificar renta activa" });
  }
});


//------ POST ------
app.post("/api/estaciones", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nombre, capacidadMaxima, coordenadas } = req.body;

    if (!nombre || !nombre.trim()) return res.status(400).json({ message: "El nombre es obligatorio." });
    if (!capacidadMaxima || capacidadMaxima < 1 || !Number.isInteger(Number(capacidadMaxima))) return res.status(400).json({ message: "La capacidad debe ser un entero mayor a 0." });
    if (!coordenadas || coordenadas.lat === undefined || coordenadas.lng === undefined) return res.status(400).json({ message: "Las coordenadas son obligatorias." });
    if (coordenadas.lat < -90 || coordenadas.lat > 90) return res.status(400).json({ message: "Latitud inválida." });
    if (coordenadas.lng < -180 || coordenadas.lng > 180) return res.status(400).json({ message: "Longitud inválida." });

    const existe = await Estacion.findOne({ nombre: nombre.trim() });
    if (existe) return res.status(400).json({ message: "Ya existe una estación con ese nombre." });

    const nuevaEstacion = new Estacion({ nombre: nombre.trim(), capacidadMaxima: Number(capacidadMaxima), coordenadas });
    await nuevaEstacion.save();

    registrarLog(`Evento Crítico: Nueva estación creada - ${nombre.trim()}`);
    res.status(201).json(nuevaEstacion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/vehiculos", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { codigoVehiculo, tipo, precioPorMinuto, estacionActual, bateria, estado } = req.body;

    if (!codigoVehiculo || !codigoVehiculo.trim()) return res.status(400).json({ message: "El código del vehículo es obligatorio." });
    if (!tipo) return res.status(400).json({ message: "El tipo de vehículo es obligatorio." });
    if (!precioPorMinuto || Number(precioPorMinuto) <= 0) return res.status(400).json({ message: "El precio por minuto debe ser mayor a 0." });
    if (!estacionActual) return res.status(400).json({ message: "La estación es obligatoria." });

    if (bateria !== undefined && (bateria < 0 || bateria > 100)) return res.status(400).json({ message: "Nivel de batería inválido." });

    const existe = await Vehiculo.findOne({ codigoVehiculo: codigoVehiculo.trim() });
    if (existe) return res.status(400).json({ message: "Ya existe un vehículo con ese código." });

    const estacionValida = await Estacion.findById(estacionActual);
    if (!estacionValida) return res.status(400).json({ message: "La estación seleccionada no existe." });

    const nuevoVehiculo = new Vehiculo({
      codigoVehiculo: codigoVehiculo.trim(),
      tipo,
      precioPorMinuto: Number(precioPorMinuto),
      estacionActual,
      bateria: bateria ?? 100,
      estado: estado || "Disponible"
    });

    await nuevoVehiculo.save();
    registrarLog(`Evento Crítico: Vehículo ${codigoVehiculo.trim()} creado`);
    res.status(201).json(nuevoVehiculo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/rentas/iniciar", verificarToken, async (req, res) => {
  try {
    const { vehiculoId } = req.body;
    const usuarioId = req.user.id; 

    // ✅ REGLA 1: Verificar si ya tiene un viaje activo
    const viajePendiente = await Renta.findOne({ usuario: usuarioId, estado: 'Activo' });
    if (viajePendiente) {
      return res.status(400).json({ message: "Ya tienes un viaje en curso. Finalízalo antes de rentar otro." });
    }
    
    const usuarioLogueado = await User.findById(usuarioId);
    if (usuarioLogueado.adeudo > 0) {
      return res.status(403).json({ 
        message: `No puedes rentar. Tienes un adeudo pendiente de $${usuarioLogueado.adeudo} MXN. Ve a tu perfil para liquidarlo.` 
      });
    }

    const vehiculo = await Vehiculo.findById(vehiculoId);
    if (!vehiculo || vehiculo.estado !== 'Disponible') {
      return res.status(400).json({ message: "El vehículo no está disponible" });
    }

    const nuevaRenta = new Renta({ usuario: usuarioId, vehiculo: vehiculoId, estado: 'Activo' });
    await nuevaRenta.save();
    await Vehiculo.findByIdAndUpdate(vehiculoId, { estado: 'En Uso' });

    registrarLog(`Evento Crítico: Renta iniciada - Vehículo: ${vehiculoId}`);
    res.status(201).json({ message: "Renta iniciada con éxito", renta: nuevaRenta });
  } catch (error) {
    console.log("Error completo:", error); // ← agrega esto
    res.status(500).json({ error: error.message });
  }
});

//------ PUT ------
app.put("/api/estaciones/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nombre, capacidadMaxima } = req.body;

    if (!nombre || !nombre.trim()) return res.status(400).json({ message: "El nombre es obligatorio." });
    if (!capacidadMaxima || Number(capacidadMaxima) < 1 || !Number.isInteger(Number(capacidadMaxima))) return res.status(400).json({ message: "La capacidad debe ser un entero mayor a 0." });

    const duplicado = await Estacion.findOne({ nombre: nombre.trim(), _id: { $ne: req.params.id } });
    if (duplicado) return res.status(400).json({ message: "Ya existe una estación con ese nombre." });

    const actualizada = await Estacion.findByIdAndUpdate(req.params.id, { nombre: nombre.trim(), capacidadMaxima: Number(capacidadMaxima) }, { new: true });
    if (!actualizada) return res.status(404).json({ message: "Estación no encontrada." });

    registrarLog(`Evento: Estación actualizada - ${nombre.trim()}`);
    res.json(actualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/vehiculos/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { precioPorMinuto, estado, estacionActual } = req.body;

    if (!precioPorMinuto || Number(precioPorMinuto) <= 0) return res.status(400).json({ message: "El precio debe ser mayor a 0." });
    if (!estado) return res.status(400).json({ message: "El estado es obligatorio." });
    if (!estacionActual) return res.status(400).json({ message: "La estación es obligatoria." });

    const estacionValida = await Estacion.findById(estacionActual);
    if (!estacionValida) return res.status(400).json({ message: "La estación seleccionada no existe." });

    const actualizado = await Vehiculo.findByIdAndUpdate(req.params.id, { precioPorMinuto: Number(precioPorMinuto), estado, estacionActual }, { new: true });
    if (!actualizado) return res.status(404).json({ message: "Vehículo no encontrado." });

    registrarLog(`Evento: Vehículo actualizado - ${actualizado.codigoVehiculo}`);
    res.json(actualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/rentas/finalizar/:id", verificarToken, async (req, res) => {
  try {
    const { fueraDeEstacion } = req.body;
    const rentaId = req.params.id;
    const renta = await Renta.findById(rentaId).populate('vehiculo');

    if (!renta) return res.status(404).json({ message: "Renta no encontrada." });
    if (renta.estado === 'Finalizado') return res.status(400).json({ message: "Esta renta ya fue finalizada." });
    if (renta.usuario.toString() !== req.user.id) return res.status(403).json({ message: "No autorizado." });

    const fechaFin = new Date();
    const minutos = Math.max(1, Math.ceil((fechaFin - renta.fechaInicio) / (1000 * 60)));
    const costoTiempo = minutos * renta.vehiculo.precioPorMinuto;

    const MULTA = 50;
    const tieneMulta = fueraDeEstacion === true;
    const costoTotal = tieneMulta ? costoTiempo + MULTA : costoTiempo;

    if (tieneMulta) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { adeudo: costoTotal } });
    }

    await new Transaccion({ 
      usuarioID: req.user.id, 
      tipo: tieneMulta ? 'Multa' : 'Cobro_Renta', 
      monto: costoTotal 
    }).save();

    renta.fechaFin = fechaFin;
    renta.costoTiempo = costoTiempo;
    renta.costoTotal = costoTotal;
    renta.multa = tieneMulta;
    renta.estado = 'Finalizado';
    await renta.save();

    await Vehiculo.findByIdAndUpdate(renta.vehiculo._id, { estado: 'Disponible' });

    registrarLog(`Evento Crítico: Renta finalizada ID: ${rentaId} - Total: $${costoTotal}`);
    res.json({ 
      message: "Renta finalizada", 
      tiempo: `${minutos} min`, 
      total: costoTotal,
      nota: tieneMulta ? `Incluye multa de $${MULTA} por abandono fuera de estación` : ""
    });
  } catch (error) {
    console.log("Error al finalizar renta:", error);
    res.status(500).json({ error: error.message });
  }
});


//------ DELETE ------
app.delete("/api/estaciones/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const estacion = await Estacion.findByIdAndDelete(req.params.id);
    if (!estacion) return res.status(404).json({ message: "Estación no encontrada." });
    registrarLog(`Evento Crítico: Estación eliminada - ${estacion.nombre}`);
    res.json({ message: "Estación eliminada correctamente" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/vehiculos/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByIdAndDelete(req.params.id);
    if (!vehiculo) return res.status(404).json({ message: "Vehículo no encontrado." });
    registrarLog(`Evento Crítico: Vehículo eliminado - ${vehiculo.codigoVehiculo}`);
    res.json({ message: "Vehículo borrado correctamente" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/usuarios/:id", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    // Evitar que un admin se elimine a sí mismo desde el backend
    if (req.user.id === req.params.id) return res.status(403).json({ message: "No puedes eliminarte a ti mismo." });

    // Evitar eliminar otros admins
    if (usuario.rol === "admin") return res.status(403).json({ message: "No se puede eliminar a un administrador." });

    await User.findByIdAndDelete(req.params.id);
    registrarLog(`Evento Crítico: Usuario eliminado - ${usuario.correo}`);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//------ BUSQUEDAS ESPECIFICAS ------
app.get("/api/usuarios/:id", verificarToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select("-password");

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(usuario);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error del servidor" });
  }
});

app.put("/api/usuarios/:id", verificarToken, async (req, res) => {
  try {
    const { nombre, apellido, pais, correo, password } = req.body;
    const update = {};

    if (nombre !== undefined) {
      if (!nombre.trim()) return res.status(400).json({ message: "El nombre no puede estar vacío." });
      const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!soloLetras.test(nombre.trim())) return res.status(400).json({ message: "El nombre solo puede contener letras." });
      update.nombre = nombre.trim();
    }

    if (apellido !== undefined) {
      if (!apellido.trim()) return res.status(400).json({ message: "El apellido no puede estar vacío." });
      const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!soloLetras.test(apellido.trim())) return res.status(400).json({ message: "El apellido solo puede contener letras." });
      update.apellido = apellido.trim();
    }

    if (pais !== undefined) {
      if (!pais.trim()) return res.status(400).json({ message: "El país no puede estar vacío." });
      const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!soloLetras.test(pais.trim())) return res.status(400).json({ message: "El pais solo puede contener letras." });
      update.pais = pais.trim();
    }

    if (correo !== undefined) {
      if (!correo.trim()) return res.status(400).json({ message: "El correo no puede estar vacío." });
      const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!correoRegex.test(correo.trim())) return res.status(400).json({ message: "Correo electrónico no válido." });
      const existingUser = await User.findOne({ correo: correo.trim().toLowerCase(), _id: { $ne: req.params.id } });
      if (existingUser) return res.status(400).json({ message: "Este correo ya está registrado." });
      update.correo = correo.trim().toLowerCase();
    }

    if (password !== undefined) {
      if (!password.trim()) return res.status(400).json({ message: "La contraseña no puede estar vacía." });
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
      if (!passwordRegex.test(password)) return res.status(400).json({ message: "La contraseña no cumple los requisitos de seguridad." });
      update.password = await bcrypt.hash(password, 10);
    }

    const actualizado = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    res.json(actualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/usuarios/metodos-pago/:tarjetaId", verificarToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    const tarjetaExiste = usuario.metodosPago.some(t => t._id.toString() === req.params.tarjetaId);
    if (!tarjetaExiste) return res.status(404).json({ message: "Tarjeta no encontrada." });

    usuario.metodosPago = usuario.metodosPago.filter(t => t._id.toString() !== req.params.tarjetaId);
    await usuario.save();

    registrarLog(`Evento: Usuario ${usuario.correo} eliminó un método de pago`);
    res.json({ message: "Tarjeta eliminada correctamente." });
  } catch (error) {
    console.log("Error en DELETE tarjeta:", error);
    res.status(500).json({ message: "Error al eliminar la tarjeta." });
  }
});


//------ REPORTES ------
app.get("/api/reportes/historial-rentas", verificarToken, async (req, res) => {
  try {
    const reporte = await Renta.find().populate('usuario', 'nombre correo').populate('vehiculo', 'codigoVehiculo tipo'); 
    res.json(reporte);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get("/api/reportes/incidentes-pendientes", verificarToken, async (req, res) => {
  try {
    const incidentesPendientes = await Incidente.find({ estado: 'Pendiente' }).populate('vehiculo', 'codigoVehiculo tipo estado').populate('reportadoPor', 'nombre correo'); 
    res.json(incidentesPendientes);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get("/api/reportes/ingresos-transacciones", verificarToken, async (req, res) => {
  try {
    const ingresos = await Transaccion.find().populate('usuarioID', 'nombre correo billetera');
    res.json(ingresos);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get("/api/reportes/ocupacion-estaciones", verificarToken, async (req, res) => {
  try {
    const ocupacion = await Vehiculo.find({ estacionActual: { $ne: null } }).populate('estacionActual', 'nombre capacidadMaxima estado');
    res.json(ocupacion);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// ------ INICIO DEL SERVIDOR ------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  registrarLog(`Inicio de proceso: Servidor abierto en puerto ${PORT}`);
  console.log(`Servidor abierto en el puerto ${PORT}`);
});