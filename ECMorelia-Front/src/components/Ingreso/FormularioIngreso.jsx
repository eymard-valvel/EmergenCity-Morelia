// src/components/Ingreso/FormularioIngreso.jsx

import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../auth/useAuth";
import { newCookie } from "../../helpers/cookies";
// Asegúrate que la ruta de importación del logo sea la correcta
import logo from '../img/Logo.png';
import usuario from '../img/formularioIngresoIcono.png'; // Asegúrate que esta imagen esté en la carpeta correcta

// Validación (sin cambios)
const validationSchema = Yup.object().shape({
	role: Yup.string().required("El tipo de usuario es requerido"),
	nombre: Yup.string().when("role", {
		is: (role) => role === "hospitales", // Simplificado
		then: (schema) => schema.required("El nombre del hospital es requerido"), // Añadido required
		otherwise: (schema) => schema,
	}),
	licencia_medica: Yup.string().when("role", {
		is: (role) => role !== "hospitales", // Simplificado
		then: (schema) => schema.required("La licencia médica es requerida"), // Añadido required
		otherwise: (schema) => schema,
	}),
	password: Yup.string().required("La contraseña es requerida").min(6, "La contraseña debe tener al menos 6 caracteres") // Corregido min a 6
});

// Valores iniciales (sin cambios)
const initialValues = {
	role: "",
	nombre: "",
	licencia_medica: "",
	password: ""
};

// Roles y Rutas (sin cambios)
const roles = [
	{ role: "Operador", value: "operador" },
	{ role: "Paramedico", value: "paramedicos" },
	{ role: "Hospital", value: "hospitales" },
	{ role: "Doctor", value: "doctor" }
];

const routes = {
	operador: "/navegaciongps",
	paramedicos: "/reportepaciente",
	hospitales: "/navmapa", // Asumiendo que hospital también va al mapa
	doctor: "/doctor"
};

const Login = () => {
	const { setAuth } = useAuth();
	const [userType, setUserType] = useState(""); // Inicializa vacío
	const navigate = useNavigate();
	const [loginError, setLoginError] = useState(""); // Estado para mensaje de error

	// Formik (cambios en onSubmit para manejar errores)
	const formik = useFormik({
		initialValues,
		validationSchema,
		validateOnBlur: true, // Habilita validación al perder foco
		validateOnChange: true, // Habilita validación al cambiar
		// En el onSubmit del FormularioIngreso.jsx, modifica esta parte:
onSubmit: async (values) => {
  setLoginError(""); // Limpia errores previos
  try {
    const newValues = {
      role: values.role,
      password: values.password,
      ...(values.role === "hospitales" ? { 
        nombre: values.nombre 
      } : { 
        licencia_medica: values.licencia_medica 
      })
    };

    const request = await fetch(`${import.meta.env.VITE_API}/auth/login/${newValues.role}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newValues)
    });

    if (!request.ok) {
      const errorData = await request.json().catch(() => ({ message: "Credenciales inválidas o error en el servidor." }));
      throw new Error(errorData.message || "Credenciales inválidas.");
    }

    const response = await request.json();
    
    // GUARDAR INFORMACIÓN DEL HOSPITAL EN LOCALSTORAGE

	// === GUARDAR INFORMACIÓN DEL HOSPITAL EN LOCALSTORAGE ===
if (values.role === "hospitales") {

  const hospital = response;

  if (!hospital.id_hospitales) {
    throw new Error("El backend no devolvió un id_hospitales válido.");
  }

  localStorage.setItem(
    "hospitalInfo",
    JSON.stringify({
      id: hospital.id_hospitales,
      nombre: hospital.nombre,
      direccion: hospital.direccion,
      ubicacion: {
        lat: hospital.latitud || 19.702428,
        lng: hospital.longitud || -101.1969319
      }
    })
  );
}
    
    newCookie({ name: "role", value: response.role });
    setAuth(response.role);
    navigate(routes[values.role]);

  } catch (error) {
    console.error("Error de login:", error.message);
    setLoginError(error.message);
  }
}
	});

	// Efecto para cargar rol guardado (sin cambios)
	useEffect(() => {
		const savedRole = localStorage.getItem("selectedRole");
		if (savedRole && roles.some(r => r.value === savedRole)) { // Verifica si el rol guardado es válido
			setUserType(savedRole);
			formik.setFieldValue("role", savedRole);
		} else if (roles.length > 0) {
			// Si no hay rol guardado o es inválido, selecciona el primero por defecto
			// setUserType(roles[0].value);
			// formik.setFieldValue("role", roles[0].value);
			// O déjalo vacío para que el usuario seleccione
			setUserType("");
			formik.setFieldValue("role", "");
		}
	}, []); // Dependencia vacía para ejecutar solo al montar

	// Actualiza userType cuando cambia el valor del dropdown en Formik
	useEffect(() => {
		setUserType(formik.values.role);
	}, [formik.values.role]);

	return (
		// Fondo principal - NUEVO COLOR 👇
		<div className="min-h-screen bg-smoke-white flex flex-col">
			{/* Topbar - NUEVOS COLORES 👇 */}
			<nav className="fixed top-0 left-0 w-full bg-gradient-to-r from-bluish-gray to-sky-blue p-2 flex items-center shadow-lg z-50"> {/* Mismo gradiente que Inicio */}
				<img src={logo} alt="Emergencity Logo" className="ml-3 cursor-pointer" width="70" onClick={() => navigate("/")} />
				<h1 className="text-lg font-bold text-smoke-white tracking-wide mx-2 cursor-pointer" onClick={() => navigate("/")}>EMERGENCITY</h1> {/* Texto Blanco Humo */}
			</nav>

			{/* Contenedor del Formulario */}
			<div className="flex items-center justify-center flex-1 p-4 sm:p-8 mt-[4.5rem]"> {/* Añadido p-4 para pantallas pequeñas */}
				{/* Tarjeta del Formulario - NUEVOS COLORES 👇 */}
				<div className="flex flex-col md:flex-row bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-4xl"> {/* Cambia a flex-col en pantallas pequeñas */}
					{/* Sección Izquierda - Imagen */}
					{/* Sección Izquierda - Imagen */}
<div className="w-full md:w-[30rem] bg-gray-100 p-6 flex items-center justify-center min-h-[350px] md:min-h-[450px]">
    <div className="flex items-center justify-center w-full h-full">
        <img
            src={usuario}
            alt="Icono Usuario"
            className="w-auto h-auto object-contain max-w-[200px] max-h-[200px] sm:max-w-[250px] sm:max-h-[250px] md:max-w-[300px] md:max-h-[300px] lg:max-w-[350px] lg:max-h-[350px]"
        />
    </div>
</div>
					{/* Sección Derecha - Formulario - NUEVOS COLORES 👇 */}
					<div className="w-full md:w-2/3 p-6 sm:p-8">
						{/* Título */}
						<h1 className="font-black text-2xl sm:text-3xl text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-blue to-coral-red"> {/* Gradiente nuevo, ajusta tamaño */}
							BIENVENIDO DE NUEVO
						</h1>
						{/* Subtítulo */}
						<h2 className="font-medium text-base sm:text-lg text-center mt-2 text-bluish-gray">Inicia sesión para continuar</h2> {/* Color y tamaño nuevo */}

						{/* Mensaje de Error */}
						{loginError && <div className="mt-4 text-center text-red-600 font-semibold bg-red-100 p-2 rounded">{loginError}</div>}
						{/* Mensajes de error de Yup */}
						{(formik.touched.role && formik.errors.role) && <div className="mt-2 text-xs text-red-600">{formik.errors.role}</div>}
						{(formik.touched.nombre && formik.errors.nombre) && <div className="mt-2 text-xs text-red-600">{formik.errors.nombre}</div>}
						{(formik.touched.licencia_medica && formik.errors.licencia_medica) && <div className="mt-2 text-xs text-red-600">{formik.errors.licencia_medica}</div>}
						{(formik.touched.password && formik.errors.password) && <div className="mt-2 text-xs text-red-600">{formik.errors.password}</div>}

						<form onSubmit={formik.handleSubmit} className="mt-6 space-y-4"> {/* Ajusta espaciado */}
							<div>
								{/* Labels */}
								<label htmlFor="role" className="block text-bluish-gray uppercase font-bold text-sm sm:text-base text-left mb-1"> {/* Color y tamaño nuevo */}
									Usuario
								</label>
								<Dropdown
									id="role" // Añadido id
									value={formik.values.role}
									onChange={(e) => {
										formik.setFieldValue("role", e.value);
										setUserType(e.value);
									}}
									//onChange={formik.handleChange} // Usa handleChange de Formik
									options={roles}
									optionLabel="role" // Muestra el 'role' (ej. "Operador")
									optionValue="value" // Usa el 'value' (ej. "operador")
									name="role"
									placeholder="Selecciona tu usuario"
									// Ajusta borde y focus
									className={`w-full rounded-md text-left capitalize border ${formik.touched.role && formik.errors.role ? 'border-red-500' : 'border-gray-300'} focus:border-sky-blue`}
									onBlur={formik.handleBlur} // Añade handleBlur
								/>
							</div>

							{userType === "hospitales" ? (
								<div>
									<label htmlFor="nombre" className="block text-bluish-gray uppercase font-bold text-sm sm:text-base text-left mb-1"> {/* Color y tamaño nuevo */}
										Nombre Hospital
									</label>
									{/* Input */}
									<input
										id="nombre"
										type="text"
										name="nombre"
										value={formik.values.nombre}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur} // Añade handleBlur
										placeholder="Nombre del Hospital"
										// Ajusta placeholder, borde, focus y borde de error
										className={`mt-1 border-2 ${formik.touched.nombre && formik.errors.nombre ? 'border-red-500' : 'border-gray-300'} w-full p-2 placeholder-gray-400 rounded-md focus:border-sky-blue focus:ring-sky-blue outline-none`}
									/>
								</div>
							) : ( // Muestra licencia solo si hay un rol seleccionado Y no es hospital
								userType && userType !== "hospitales" && (
									<div>
										<label htmlFor="licencia_medica" className="block text-bluish-gray uppercase font-bold text-sm sm:text-base text-left mb-1"> {/* Color y tamaño nuevo */}
											Licencia Medica
										</label>
										{/* Input */}
										<input
											id="licencia_medica"
											type="text"
											name="licencia_medica"
											value={formik.values.licencia_medica}
											onChange={formik.handleChange}
											onBlur={formik.handleBlur} // Añade handleBlur
											placeholder="Licencia Médica"
											// Ajusta placeholder, borde, focus y borde de error
											className={`mt-1 border-2 ${formik.touched.licencia_medica && formik.errors.licencia_medica ? 'border-red-500' : 'border-gray-300'} w-full p-2 placeholder-gray-400 rounded-md focus:border-sky-blue focus:ring-sky-blue outline-none`}
										/>
									</div>
								)
							)}

							<div>
								<label htmlFor="password" className="block text-bluish-gray uppercase font-bold text-sm sm:text-base text-left mb-1"> {/* Color y tamaño nuevo */}
									Contraseña
								</label>
								{/* Input */}
								<input
									id="password"
									type="password"
									name="password"
									value={formik.values.password}
									onChange={formik.handleChange}
									onBlur={formik.handleBlur} // Añade handleBlur
									placeholder="Ingresa tu contraseña"
									// Ajusta placeholder, borde, focus y borde de error
									className={`mt-1 border-2 ${formik.touched.password && formik.errors.password ? 'border-red-500' : 'border-gray-300'} w-full p-2 placeholder-gray-400 rounded-md focus:border-sky-blue focus:ring-sky-blue outline-none`}
								/>
							</div>

							{/* Botón Ingresar */}
							<button
								type="submit"
								// Colores nuevos, deshabilita si el formulario no es válido
								className={`w-full text-white font-bold p-3 rounded-md transition-colors ${!formik.isValid || formik.isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-coral-red hover:bg-red-400'}`}
								disabled={!formik.isValid || formik.isSubmitting} // Deshabilita el botón si no es válido o se está enviando
							>
								{formik.isSubmitting ? 'Ingresando...' : 'Ingresar'}
							</button>

							{/* Enlaces */}
							<div className="text-center mt-4 space-y-1"> {/* Reduce espacio */}
								<button
									type="button" // Importante
									className="font-medium text-sky-blue hover:underline text-sm sm:text-base" // Color y tamaño nuevo
									onClick={() => {
										const selectedRole = formik.values.role || localStorage.getItem("selectedRole") || "operador"; // Usa operador como fallback si no hay nada
										navigate(`/signup/${selectedRole}`);
									}}
								>
									¿No tienes cuenta? Regístrate
								</button>
								<br />
								<button
									type="button" // Importante
									className="font-medium text-sky-blue hover:underline text-sm sm:text-base" // Color y tamaño nuevo
									onClick={() => navigate("/recover-password")}
								>
									Olvidé mi contraseña
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};
export default Login;