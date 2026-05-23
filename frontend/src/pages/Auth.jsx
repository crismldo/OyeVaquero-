import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import './Auth.css';
import logoHeyVaquero from '../assets/images/LOGO1.png';

function Auth() {
  const navigate = useNavigate();

  const [registerData, setRegisterData] = useState({
    nombre: "", apellido: "", pais: "", fechaNacimiento: "", correo: "", password: ""
  });
  const [loginData, setLoginData] = useState({ correo: "", password: "" });
  const [isActive, setIsActive] = useState(false);

  const handleChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });

const handleRegister = async (e) => {
    e.preventDefault();

    const { nombre, apellido, pais, fechaNacimiento, correo, password } = registerData;

    // 1. No casillas vacías NI ESPACIOS
    const camposTexto = [nombre, apellido, pais, correo, password];
    if (camposTexto.some(c => !c || !c.trim()) || !fechaNacimiento) {
      alert("Por favor, llena todos los campos Vaquero!");
      return;
    }

    // 2. Solo letras en nombre y apellido (incluye espacios y acentos)
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(nombre) || !nombreRegex.test(apellido)) {
      alert("El nombre y apellido solo pueden contener letras.");
      return;
    }

    // 3. No menores de 15 años
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const mes = hoy.getMonth() - cumple.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }

    if (edad < 15) {
      alert("Lo sentimos, debes tener al menos 15 años para registrarte.");
      return;
    }

    // 4. Contraseña segura (mínimo 8 caracteres, una mayúscula, una minúscula y un número)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert("La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.");
      return;
    }

    // 5. Correo con dominio válido
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!correoRegex.test(correo)) {
      alert("Por favor ingresa un correo con dominio válido (ej: correo@gmail.com).");
      return;
    }

    // ---- PROCESO DE REGISTRO
    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registerData,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          pais: pais.trim(),
          correo: correo.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("¡Cuenta creada con éxito! Ahora inicia sesión.");
        setRegisterData({
          nombre: "", apellido: "", pais: "", fechaNacimiento: "", correo: "", password: ""
        });
        setIsActive(false); 
      } else {
        // Aquí se muestra el error si el usuario ya existe (viene del backend)
        alert(data.message || "Error al registrar");
      }

    } catch (error) {
      console.error(error);
      alert("Error de conexión con el servidor");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.user));
        setLoginData({ correo: "", password: "" });
        navigate("/");
      } else {
        alert(data.message || "Error al iniciar sesión");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  return (
    <div className="auth-body">
      <div className={`container ${isActive ? 'active' : ''}`}>
        
        {/* Lado del Formulario de Login */}
        <div className="form-box login">
          <form onSubmit={handleLogin}>
            <h1 className="rye-font">Login</h1>
            <div className="input-box">
              <input type="email" name="correo" placeholder="Email" required value={loginData.correo} onChange={handleLoginChange} />
              <i className='bx bxs-envelope'></i>
            </div>
            <div className="input-box">
              <input type="password" name="password" placeholder="Password" required value={loginData.password} onChange={handleLoginChange} />
              <i className='bx bxs-lock-alt'></i>
            </div>
            <button type="submit" className="btn">Iniciar sesión</button>
          </form>
        </div>

        {/* Lado del Formulario de Registro */}
        <div className="form-box register">
          <form onSubmit={handleRegister}>
            <h1 className="rye-font">Registro</h1>
            <div className="input-box">
              <input type="text" name="nombre" placeholder="Nombre" required value={registerData.nombre} onChange={handleChange} />
              <i className='bx bxs-user'></i>
            </div>
            <div className="input-box">
              <input type="text" name="apellido" placeholder="Apellido" required value={registerData.apellido} onChange={handleChange} />
              <i className='bx bxs-user'></i>
            </div>
            <div className="input-box">
              <input type="date" name="fechaNacimiento" required value={registerData.fechaNacimiento} onChange={handleChange} />
              <i className='bx bxs-calendar'></i>
            </div>
            <div className="input-box">
              <input type="text" name="pais" placeholder="País" required value={registerData.pais} onChange={handleChange} />
              <i className='bx bxs-map'></i>
            </div>
            <div className="input-box">
              <input type="email" name="correo" placeholder="Email" required value={registerData.correo} onChange={handleChange} />
              <i className='bx bxs-envelope'></i>
            </div>
            <div className="input-box">
              <input type="password" name="password" placeholder="Password (Ej: Vaquero123)" required value={registerData.password} onChange={handleChange} />
              <i className='bx bxs-lock-alt'></i>
            </div>
            <button type="submit" className="btn">Registrar</button>
          </form>
        </div>

        {/* Panel de Movimiento */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <img src={logoHeyVaquero} className="logo-panel" alt="Logo" />
            <h1 className="rye-font" style={{color: 'white'}}>¡Hola!</h1>
            <p>¿Aún no tienes cuenta?</p>
            <button className="btn" style={{background:'transparent', border:'2px solid white', width:'150px'}} onClick={() => setIsActive(true)}>Regístrate</button>
          </div>
          <div className="toggle-panel toggle-right">
            <img src={logoHeyVaquero} className="logo-panel" alt="Logo" />
            <h1 className="rye-font" style={{color: 'white'}}>¡Bienvenido!</h1>
            <p>¿Listo para la ruta?</p>
            <button className="btn" style={{background:'transparent', border:'2px solid white', width:'150px'}} onClick={() => setIsActive(false)}>Login</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;