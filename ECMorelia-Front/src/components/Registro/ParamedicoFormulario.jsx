import { useNavigate } from "react-router-dom";
import usuario from '../img/formularioRegistroIcono.jpg';
import logo from '../img/Logo.png'; // Asegúrate de que el logo esté en la carpeta correcta
import { useFormik } from "formik";
import * as Yup from "yup";


const validationSchema = Yup.object().shape({
	nombre: Yup.string()
		.required("El nombre es obligatorio")
		.min(2, "El nombre debe tener al menos 2 caracteres")
		.max(50, "El nombre no puede exceder los 50 caracteres"),
	apellidos: Yup.string()
		.required("El apellido es obligatorio")
		.min(2, "El nombre debe tener al menos 2 caracteres")
		.max(50, "El nombre no puede exceder los 50 caracteres"),
	licencia_medica: Yup.string().required("La licencia médica es requerida"),
	certificado: Yup.string().required("El certificado es obligatorio"),
	licencia_conducir: Yup.string().required("La licencia de conducir es requerida"),
	password: Yup.string().required("La contraseña es requerida").min(6, "La contraseña debe tener al menos 5 caracteres")
});

const initialValues = {
	nombre: "",
	apellidos: "",
	licencia_medica: "",
	certificado: "",
	licencia_conducir: "",
	password: ""
};

export const ParamedicoFormulario = () => {
	const navigate = useNavigate();
	const formik = useFormik({
		initialValues,
		validationSchema,
		validateOnBlur: false,
		validateOnChange: false,
		onSubmit: async (values) => {
			try {
				await fetch(`${import.meta.env.VITE_API}/auth/signup/paramedicos`, {
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

		{/* Contenido Principal */}
		<div className="flex items-center justify-center flex-1 p-8 mt-16" onSubmit={formik.handleSubmit}>
                <div className="flex bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-6xl transform transition duration-500">

                    {/* Sección Izquierda - Datos */}
                    <div className="w-1/3 bg-gray-100 p-8 flex flex-col items-center">
                        <img className="w-100  mt-32 mb-4" src={usuario} alt="Usuario" />
                    </div>

					{/* Sección Derecha - Formulario de Registro */}
					<div className="w-2/3 p-8">
					<h1 className="font-black text-3xl text-center text-transparent bg-clip-text bg-gradient-to-r from-[#002D62] to-[#74C2E1]">
						REGISTRO DE CUENTA
					</h1>

					{/* Sección de Formularios en 2 columnas */}
					<form onSubmit={formik.handleSubmit}>
					<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
						<fieldset className="flex flex-col gap-3">
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
							placeholder="Nombre"
							className="ml-29 mt-2 border border-gray-300 rounded-md w-full sm:w-80 p-2 placeholder-stone-400"
							value={formik.values.nombre}
							onChange={formik.handleChange}
							/>
							{formik.errors.nombre && <p className="text-red-500 font-bold">{formik.errors.nombre}</p>}
						</div>

  						 {/* Campo: Apellidos */}
						<div>
								<label
								htmlFor="apellidos"
								className="block text-blue-950 dark:text-gray-200 uppercase font-bold text-2xl text-left"
								>
								APELLIDOS
								</label>
								<input
								id="apellidos"
								type="text"
								name="apellidos"
								placeholder="Apellidos"
								className="ml-29 mt-2 border border-gray-300 rounded-md w-full sm:w-80 p-2 placeholder-stone-400"
								value={formik.values.apellidos}
								onChange={formik.handleChange}
								/>
								{formik.errors.apellidos && <p className="text-red-500 font-bold">{formik.errors.apellidos}</p>}
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
								className="ml-29 mt-2 border border-gray-300 rounded-md w-full sm:w-80 p-2 placeholder-stone-400"
								value={formik.values.licencia_medica}
								onChange={formik.handleChange}
								/>
								{formik.errors.licencia_medica && (
								<p className="text-red-500 font-bold">{formik.errors.licencia_medica}</p>
								)}
						</div>

						</fieldset>
						
						<fieldset className="flex flex-col gap-3">

						{/* Campo: Certificado */}
						<div>
							<label
							htmlFor="certificado"
							className="block text-blue-950 dark:text-gray-200 uppercase font-bold text-2xl text-left"
							>
							CERTIFICADO
							</label>
							<input
							id="certificado"
							type="text"
							name="certificado"
							placeholder="Certificado"
							className="ml-29 mt-2 border border-gray-300 rounded-md w-full sm:w-80 p-2 placeholder-stone-400"
							value={formik.values.certificado}
							onChange={formik.handleChange}
							/>
							{formik.errors.certificado && <p className="text-red-500 font-bold">{formik.errors.certificado}</p>}
						</div>

						{/* Campo: Licencia Conducir */}
						<div>
							<label
							htmlFor="licencia_conducir"
							className="block text-blue-950 dark:text-gray-200 uppercase font-bold text-2xl text-left"
							>
							LICENCIA DE CONDUCIR
							</label>
							<input
							id="licencia_conducir"
							type="text"
							name="licencia_conducir"
							placeholder="Licencia para conducir"
							className="ml-29 mt-2 border border-gray-300 rounded-md w-full sm:w-80 p-2 placeholder-stone-400"
							value={formik.values.licencia_conducir}
							onChange={formik.handleChange}
							/>
							{formik.errors.licencia_conducir && (
							<p className="text-red-500 font-bold">{formik.errors.licencia_conducir}</p>
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
							className="ml-29 mt-2 border border-gray-300 rounded-md w-full sm:w-80 p-2 placeholder-stone-400"
							value={formik.values.password}
							onChange={formik.handleChange}
							/>
							{formik.errors.password && <p className="text-red-500 font-bold">{formik.errors.password}</p>}
						</div>
						</fieldset>
					</div>

					{/* Botón Registrar centrado */}
					<div className="flex justify-center">
						<input
						type="submit"
						className="rounded-md bg-cyan-500 p-3 text-white uppercase font-bold hover:bg-cyan-300 transition-colors w-80 mt-8"
						value="Registrar"
						/>
					</div>

					{/* Sección de texto centrado */}
					<div className="text-center mt-3 dark:text-gray-600">
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
