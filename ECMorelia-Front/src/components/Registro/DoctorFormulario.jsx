import { useNavigate } from "react-router-dom";
import usuario from '../img/formularioRegistroIcono.jpg';
import logo from '../img/Logo.png'; // Asegúrate de que el logo esté en la carpeta correcta
import { useFormik } from "formik";
import * as Yup from "yup";

const validationSchema = Yup.object().shape({
	nombre: Yup.string()
		.required("El nombre es requerido")
		.min(2, "El nombre debe tener al menos 2 caracteres")
		.max(50, "El nombre no puede exceder los 50 caracteres"),
	licencia_medica: Yup.string()
		.required("La licencia médica es requerida")
		.matches(/^[A-Z0-9]+$/, "La licencia médica solo puede contener letras mayúsculas y números"),
	password: Yup.string().required("La contraseña es requerida").min(6, "La contraseña debe tener al menos 5 caracteres")
});

const initialValues = {
	nombre: "",
	licencia_medica: "",
	password: ""
};

export const DoctorFormulario = () => {
	const navigate = useNavigate();
	const formik = useFormik({
		initialValues,
		validationSchema,
		validateOnBlur: false,
		validateOnChange: false,
		onSubmit: async (values) => {
			try {
				await fetch(`${import.meta.env.VITE_API}/auth/signup/doctor`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify(values)
				});
				navigate("/login");
			} catch (error) {
				console.error(error.message);
			}
		}
	});

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 flex flex-col">
		{/* Topbar */}
		<nav className="fixed top-0 left-0 w-full bg-gradient-to-r from-[#002D62] to-[#74C2E1] p-2 flex items-center shadow-lg z-50">
			<img src={logo} alt="Emergencity Logo"  className="ml-3 cursor-pointer" width="70" onClick={() => navigate("/")} />
			<h1 className="text-lg font-bold text-white tracking-wide mx-2 cursor-pointer" onClick={() => navigate("/")}>EMERGENCITY</h1>
		</nav>

		{/* Contenedor del Formulario */}
		<div className="flex items-center justify-center flex-1 p-8 mt-[4.5rem]">
			<div className="flex bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-4xl">

			{/* Sección Izquierda - Imagen o detalles */}
			<div className="w-[30rem] bg-gray-100 p-8 flex flex-col items-center">
				<img
				src={usuario}
				alt="Icono Usuario"
				style={{ width: "100%", height: "100%",  maxWidth: "350px", maxHeight: "300px" }}
				className="mt-40 mb-4"
				/>
			</div>

			{/* Sección Derecha - Formulario de Registro */}
			<div className="w-2/3 p-8">
						<h1 className="font-black text-3xl text-center text-transparent bg-clip-text bg-gradient-to-r from-[#002D62] to-[#74C2E1]">
							REGISTRO DE CUENTA
						</h1>

						<form onSubmit={formik.handleSubmit} className="mt-6 space-y-5">					
							{/* Campo: Nombre */}
							<div>
								<label
								htmlFor="nombre"
								className="block text-blue-950 dark:text-gray-200 uppercase font-bold text-2xl text-left"
								>
								NOMBRE
								</label>
								<input
								id="nombre"
								type="text"
								name="nombre"
								placeholder="Nombre Completo"
								className="mt-2 border-2 w-full p-2 placeholder-stone-400 rounded-md"
								value={formik.values.nombre}
								onChange={formik.handleChange}
								/>
								{formik.errors.nombre && <p className="text-red-500 font-bold">{formik.errors.nombre}</p>}
							</div>

							{/* Campo: Licencia Médica */}
							<div>
								<label
								htmlFor="licencia_medica"
								className="block text-blue-950 dark:text-gray-200 uppercase font-bold text-2xl text-left"
								>
								LICENCIA MEDICA
								</label>
								<input
								id="licencia_medica"
								type="text"
								name="licencia_medica"
								placeholder="Licencia Médica"
								className="mt-2 border-2 w-full p-2 placeholder-stone-400 rounded-md"
								value={formik.values.licencia_medica}
								onChange={formik.handleChange}
								/>
								{formik.errors.licencia_medica && (
								<p className="text-red-500 font-bold">{formik.errors.licencia_medica}</p>
								)}
							</div>

							{/* Campo: Contraseña */}
							<div>
								<label
								htmlFor="password"
								className="block text-blue-950 dark:text-gray-200 uppercase font-bold text-2xl text-left"
								>
								CONTRASEÑA
								</label>
								<input
								id="password"
								type="password"
								name="password"
								placeholder="Contraseña con más de 5 caracteres"
								className="mt-2 border-2 w-full p-2 placeholder-stone-400 rounded-md"
								value={formik.values.password}
								onChange={formik.handleChange}
								/>
								{formik.errors.password && <p className="text-red-500 font-bold">{formik.errors.password}</p>}
							</div>

							{/* Botón de envío */}
							<input
								type="submit"
								className="rounded-md bg-cyan-500 p-3 text-white uppercase font-bold hover:bg-cyan-300 transition-colors w-full mt-5"
								value="Registrar"
							/>

							{/* Enlace de inicio de sesión */}
							<div className="flex justify-center mt-10 dark:text-gray-600">
							<h2 className="font-medium">
								¿Ya tienes cuenta?
								<button
									className="font-medium text-blue-600 dark:text-blue-500 hover:underline ml-2 mt-2"
									onClick={() => navigate("/login")}
								>
									Iniciar Sesión
								</button>
							</h2>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
	
	);
};
