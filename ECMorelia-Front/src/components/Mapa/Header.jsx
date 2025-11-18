// src/components/Mapa/Header.jsx

import { useNavigate } from "react-router-dom";
import { useState } from "react";
// Asegúrate que las rutas de importación sean correctas
import logo from "../img/Logo.png";
import usuario from "../img/usuario.png";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { useAuth } from "../../auth/useAuth.js";
import { deleteCookie } from "../../helpers/cookies.js";

export default function Header() {
	const [visible, setVisible] = useState(false); // Estado para la visibilidad del Sidebar
	const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Estado para el dropdown de perfil
	const navigate = useNavigate();
	const { isAuthenticated, setAuth } = useAuth();

	// Función para cerrar sesión (sin cambios)
	const closeSession = () => {
		deleteCookie("role");
		setAuth(false);
		navigate("/login");
	};

	// Lista de elementos del menú lateral para simplificar el renderizado
	const sidebarItems = [
		{ label: "Mapa", icon: "pi pi-map-marker", path: "/navmapa" },
		{ label: "Gestión de Ambulancias", icon: "pi pi-ambulance", path: "/ambulancias" },
		{ label: "Gestión Paramédicos", icon: "pi pi-users", path: "/paramedicos" },
		{ label: "Gestión de Hospitales", icon: "pi pi-building", path: "/hospitales" }, // Icono actualizado
		{ label: "Gestión de Operadores", icon: "pi pi-headphones", path: "/operadores" }, // Icono actualizado
		{ label: "Gestión de Médicos", icon: "pi pi-user-md", path: "/medicos" } // Icono actualizado
	];

	return (
		// Barra superior - NUEVOS COLORES 👇
		<header className="bg-bluish-gray flex items-center h-16 sm:h-20 p-4 shadow-md sticky top-0 z-40"> {/* Fondo gris azulado, altura ajustada, sombra, sticky */}
			{/* Botón para abrir Sidebar (solo visible si no es operador/paramédico) */}
			{isAuthenticated !== "operador" && isAuthenticated !== "paramedico" && (
				<Button
					icon="pi pi-bars" // Icono de menú hamburguesa
					className="p-button-text !text-smoke-white mr-2 focus:!shadow-none hover:!bg-sky-blue/20" // Color blanco humo, sin fondo, hover sutil
					onClick={() => setVisible(true)}
				/>
			)}

			{/* Título y Logo */}
			<div className="flex-grow flex justify-center items-center"> {/* Centrado */}
				<h1 className="font-semibold text-2xl sm:text-3xl text-smoke-white mr-2">EMERGENCITY</h1> {/* Texto blanco humo, tamaño ajustado */}
				<img className="w-10 h-10 sm:w-12 sm:h-12" src={logo} alt="Logo" /> {/* Tamaño ajustado */}
			</div>

			{/* Sidebar (Menú Lateral) - NUEVOS COLORES 👇 */}
			<Sidebar
				visible={visible}
				onHide={() => setVisible(false)}
				className="w-full max-w-xs sm:max-w-sm md:max-w-md" // Ancho responsivo
				pt={{ // Usando PrimeReact PassThrough para estilizar partes internas
					root: { className: 'bg-smoke-white dark:bg-bluish-gray' },
					header: { className: 'p-4 border-b border-gray-200 dark:border-gray-700' },
					content: { className: 'p-4' },
					closeButton: { className: '!text-bluish-gray dark:!text-smoke-white hover:!bg-gray-200 dark:hover:!bg-gray-600 rounded-full' } // Estilo botón cerrar
				}}
			>
				<h2 className="text-xl font-bold mb-5 text-sky-blue">Menú Principal</h2> {/* Título azul cielo */}
				<div className="flex flex-col space-y-2">
					{sidebarItems.map((item) => (
						<Button
							key={item.label}
							label={item.label}
							icon={item.icon}
							// Estilo base texto, hover y focus
							className="p-button-text !text-bluish-gray dark:!text-smoke-white hover:!bg-sky-blue/10 dark:hover:!bg-sky-blue/20 !justify-start text-left rounded-md focus:!shadow-outline-blue"
							onClick={() => {
								navigate(item.path);
								setVisible(false); // Cierra el sidebar al navegar
							}}
						/>
					))}
				</div>
			</Sidebar>

			{/* Menú Dropdown Perfil - NUEVOS COLORES 👇 */}
			<div className="relative"> {/* Contenedor relativo para posicionar dropdown */}
				<button
					className="ml-auto mr-2 sm:mr-4 flex items-center justify-center rounded-full overflow-hidden border-2 border-smoke-white hover:border-sky-blue transition-colors focus:outline-none focus:ring-2 focus:ring-sky-blue focus:ring-offset-2 focus:ring-offset-bluish-gray" // Borde blanco, hover azul, focus azul
					onClick={() => setIsDropdownOpen(!isDropdownOpen)}
					aria-haspopup="true"
					aria-expanded={isDropdownOpen}
				>
					<img className="w-8 h-8 sm:w-10 sm:h-10 object-cover" src={usuario} alt="Perfil" /> {/* Imagen perfil */}
				</button>
				{/* Contenido del Dropdown */}
				{isDropdownOpen && (
					<div
						className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5" // Posición, fondo, sombra
						role="menu"
						aria-orientation="vertical"
						aria-labelledby="user-menu-button"
					>
						{/* Botón Cerrar Sesión */}
						<button
							className="block w-full text-left px-4 py-2 text-sm text-coral-red hover:bg-red-100 dark:hover:bg-red-600/30 dark:text-red-400 font-medium" // Color rojo coral, hover sutil
							role="menuitem"
							onClick={closeSession} // Llama a la función directamente
						>
							Cerrar Sesión
						</button>
					</div>
				)}
			</div>
		</header>
	);
}