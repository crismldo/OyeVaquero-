const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require('fs');

// ------ IMPORTACIONES DE MODELOS ------
const User = require("./Models/Usuario.js"); 

const app = express();
app.use(cors()); 
app.use(express.json());

// ------ FUNCIÓN DE LOGS ------
const registrarLog = (mensaje) => {
  const logMensaje = `[${new Date().toLocaleString()}] - ${mensaje}\n`;
  fs.appendFileSync('backend_critical.log', logMensaje);
};


// ------ CONEXIÓN A LA BD ------
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    registrarLog('Conexión exitosa a MongoDB');
    console.log('¡Base de datos conectada exitosamente!');
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

// ------  METODOS DE PAGO ------
app.get("/api/usuarios/metodos-pago", verificarToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    
    const tarjetasSeguras = (usuario.metodosPago || []).map(t => ({
      _id: t._id,
      ultimos4: t.ultimos4,
      marca: t.marca,
      expiracion: t.expiracion
    }));
    
    res.json(tarjetasSeguras);
  } catch (error) {
    console.log("Error en GET tarjetas:", error);
    res.status(500).json({ message: "Error al obtener métodos de pago" });
  }
});

app.post("/api/usuarios/metodos-pago", verificarToken, async (req, res) => {
  try {
    const { numeroTarjeta, expiracion, alias } = req.body;

    if (!numeroTarjeta || !expiracion || !alias?.trim()) {
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

    usuario.metodosPago.push({ ultimos4, marca, expiracion, alias: alias.trim(), tarjetaEncriptada });
    await usuario.save();

    registrarLog(`Evento: Usuario ${usuario.correo} guardó un nuevo método de pago`);
    res.status(201).json({ message: "Tarjeta guardada con seguridad" });
  } catch (error) {
    console.log("Error en POST tarjetas:", error);
    res.status(500).json({ message: "Error al guardar tarjeta" });
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

//-----------------------------------------------------------------------------------------------

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


// ------ INICIO DEL SERVIDOR ------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  registrarLog(`Inicio de proceso: Servidor abierto en puerto ${PORT}`);
  console.log(`Servidor abierto en el puerto ${PORT}`);
});