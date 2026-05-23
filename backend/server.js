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
    const actualizado = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
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