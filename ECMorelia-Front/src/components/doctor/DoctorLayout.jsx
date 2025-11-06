// src/components/doctor/DoctorLayout.jsx

import { NavLink, Outlet, useNavigate } from "react-router-dom";
// Asegúrate que la ruta de importación del logo sea la correcta
import logo from "../img/Logo.png";
import { useAuth } from "../../auth/useAuth";
import { deleteCookie } from "../../helpers/cookies";

export default function DoctorLayout() {
	const navigate = useNavigate();
	const { setAuth } = useAuth();

	// Función para cerrar sesión (sin cambios)
	const handleLogout = () => {
		setAuth(false);
		deleteCookie("role");
		navigate("/login"); // Redirige al usuario al iniciar sesión
	};

	// Define la clase para la pestaña activa usando los nuevos colores - NUEVOS COLORES 👇
	const activeTab = "text-sky-blue bg-sky-blue/10 dark:bg-sky-blue/20 font-semibold"; // Azul cielo con fondo sutil y negrita

	return (
		// Contenedor principal flex - Sin cambios estructurales
		<div className="flex w-full min-h-screen"> {/* Asegura altura mínima */}

			{/* Barra de Navegación Lateral (Sidebar) - NUEVOS COLORES 👇 */}
			<nav className="flex flex-col w-full max-w-[250px] py-3 min-h-full gap-3 bg-smoke-white text-bluish-gray dark:bg-bluish-gray dark:text-smoke-white shadow-lg shrink-0"> {/* Fondo blanco humo/gris azulado, sombra */}
				<ul className="flex flex-col pt-0 m-0">
					{/* Sección del Logo */}
					<li className="flex justify-center p-4 mb-4 border-b border-gray-200 dark:border-gray-700"> {/* Separador */}
						<img className="max-w-24 max-h-24 w-auto h-auto" src={logo} alt="Emergencity" /> {/* Logo ya reemplazado, ajustado tamaño auto */}
					</li>

					{/* Botón Llamada - NUEVOS COLORES 👇 */}
					<li className="px-4 mb-4"> {/* Añadido padding horizontal */}
						<button
							id="botonLlamada"
							// Estilo consistente con otros botones principales (Rojo Coral)
							className="w-full relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-bluish-gray dark:text-smoke-white rounded-lg group bg-gradient-to-br from-coral-red to-red-400 group-hover:from-coral-red group-hover:to-red-400 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800"
							onClick={() => navigate("/videocall")}
						>
              <span className="w-full relative px-5 py-2.5 transition-all ease-in duration-75 bg-smoke-white dark:bg-bluish-gray rounded-md group-hover:bg-opacity-0 text-lg"> {/* Fondo interior coincide con sidebar */}
								Videollamada
              </span>
						</button>
					</li>

					{/* NavLink Reportes - NUEVOS COLORES 👇 */}
					<li>
						<NavLink
							to="/doctor/records" // Asegúrate que esta es la ruta correcta según Rutas.jsx
							className={({ isActive }) =>
								// Estilo base, hover y activo
								`block py-2 px-4 text-base md:text-lg capitalize hover:bg-sky-blue/10 dark:hover:bg-sky-blue/20 rounded-md mx-2 transition-colors duration-150 ${ // Añade block, redondeo, margen y transición
									isActive ? activeTab : "text-bluish-gray dark:text-smoke-white" // Aplica color base si no está activo
								}`
							}
						>
							Reportes
						</NavLink>
					</li>

					{/* Espaciador (opcional, empuja logout hacia abajo) */}
					<li className="flex-grow"></li>

					{/* Botón Cerrar sesión - NUEVOS COLORES 👇 */}
					<li className="mt-auto mb-2 mx-2"> {/* Empuja al fondo y añade margen */}
						<p
							// Estilo base rojo coral sutil, hover más intenso
							className={`block py-2 px-4 text-base md:text-lg capitalize text-coral-red dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-500/20 hover:font-semibold rounded-md cursor-pointer transition-colors duration-150`}
							onClick={handleLogout}
						>
							Cerrar sesión
						</p>
					</li>
				</ul>
			</nav>

			{/* Área de Contenido Principal - NUEVO ESTILO 👇 */}
			<main className="flex-grow p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900 overflow-y-auto"> {/* Fondo contrastante, padding y scroll si es necesario */}
				<Outlet /> {/* Aquí se renderizará ReportesPage.jsx u otras sub-rutas */}
			</main>
		</div>
	);
}