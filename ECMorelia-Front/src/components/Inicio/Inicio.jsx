// src/components/Inicio/Inicio.jsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Typed from "typed.js";
import logo from "../img/Logo.png"; //
import carrusel1 from "../img/carrusel1.jpeg"; //
import carrusel3 from "../img/carrusel3.jpg"; //
import carrusel4 from "../img/carrusel4.jpg"; //
import Slider from "react-slick";

import "slick-carousel/slick/slick.css"; //
import "slick-carousel/slick/slick-theme.css"; //

const Inicio = () => {
	const navigate = useNavigate(); //

	// Configuración del Typed.js (sin cambios)
	useEffect(() => {
		const options = {
			stringsElement: "#cadenas-texto", //
			typeSpeed: 75, //
			startDelay: 300, //
			backSpeed: 75, //
			smartBackspace: true, //
			shuffle: false, //
			backDelay: 1500, //
			loop: true, //
			loopCount: false, //
			showCursor: true, //
			cursorChar: "|", //
			contentType: "html" //
		};

		const typed = new Typed(".typed", options); //
		return () => {
			typed.destroy(); //
		};
	}, []);

	// Configuración del carrusel (sin cambios)
	const settings = {
		dots: true, //
		infinite: true, //
		speed: 500, //
		slidesToShow: 1, //
		slidesToScroll: 1, //
		autoplay: true, //
		autoplaySpeed: 2000, //
		fade: true //
	};

	// Función para manejar el click de los botones (sin cambios)
	const handleButtonClick = (role) => {
		localStorage.setItem("selectedRole", role); //
		navigate("/login"); //
	};

	return (
		<div className="relative w-full h-screen overflow-hidden">
			{/* Carrusel */}
			<Slider {...settings} className="absolute w-full h-full z-0">
				<div>
					<img
						src={carrusel1} //
						alt="Image 1"
						className="w-full h-full object-cover"
						style={{ filter: "blur(0.200rem)" }} //
					/>
				</div>
				<div>
					<img
						src={carrusel3} //
						alt="Image 3"
						className="w-full h-full object-cover"
						style={{ filter: "blur(0.200rem)" }} //
					/>
				</div>
				<div>
					<img
						src={carrusel4} //
						alt="Image 4"
						className="w-full h-full object-cover"
						style={{ filter: "blur(0.200rem)" }} //
					/>
				</div>
			</Slider>

			{/* Top Bar */}
			<nav className="fixed top-0 left-0 w-full bg-gradient-to-r from-bluish-gray to-sky-blue p-2 flex items-center shadow-lg z-50">
				<img src={logo} alt="Emergencity Logo" className="ml-3" width="70" /> {/* */}
				<h1 className="text-lg font-bold text-smoke-white tracking-wide mx-2 ">EMERGENCITY</h1>
			</nav>

			{/* Sección principal con tarjeta */}
			<section className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
				<div className="bg-smoke-white bg-opacity-95 backdrop-blur-md p-8 rounded-xl shadow-xl flex flex-col items-center min-w-[300px] max-w-lg md:max-w-2xl">
					<img src={logo} alt="Logo del Proyecto" className="mb-4" width="150" /> {/* */}
					<h1 className="text-5xl font-bold text-bluish-gray drop-shadow-lg text-center">EMERGENCITY</h1>
					<h2 className="subtitulo-inicio drop-shadow-lg mt-2">
						<span className="typed text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-coral-red to-sky-blue animate-brighter"></span> {/* */}
					</h2>
					<div id="cadenas-texto" className="hidden"> {/* */}
						<p className="cadena">Brindando ayuda, salvando vidas</p> {/* */}
						<p className="cadena">Tu compromiso hace la diferencia</p> {/* */}
					</div>

					{/* --- BOTONES CORREGIDOS --- 👇 */}
					<div className="container mt-10 flex justify-center items-center flex-wrap gap-4">

						{/* Botón Operador */}
						<button
							id="botonOperador"
							// ESTADO INICIAL: Borde coral, texto coral, fondo transparente.
							// ESTADO HOVER: Fondo gradiente coral, texto blanco.
							// Eliminamos el `<span>` interior y aplicamos padding/estilos directamente al botón.
							className="px-5 py-2.5 relative rounded-lg border-2 border-coral-red text-coral-red bg-transparent text-xl font-medium hover:text-white hover:bg-gradient-to-br from-coral-red to-red-400 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 transition-colors duration-150 ease-in mb-2 me-2"
							onClick={() => handleButtonClick("operador")}
						>
							Operador
						</button>

						{/* Botón Personal Paramédico (mismo estilo que Operador) */}
						<button
							id="botonParamedico"
							className="px-5 py-2.5 relative rounded-lg border-2 border-coral-red text-coral-red bg-transparent text-xl font-medium hover:text-white hover:bg-gradient-to-br from-coral-red to-red-400 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 transition-colors duration-150 ease-in mb-2 me-2"
							onClick={() => handleButtonClick("paramedicos")}
						>
							Personal Paramédico
						</button>

						{/* Botón Hospital */}
						<button
							id="botonHospital"
							// ESTADO INICIAL: Borde azul, texto azul, fondo transparente.
							// ESTADO HOVER: Fondo gradiente azul, texto blanco.
							className="px-5 py-2.5 relative rounded-lg border-2 border-sky-blue text-sky-blue bg-transparent text-xl font-medium hover:text-white hover:bg-gradient-to-br from-sky-blue to-blue-400 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 transition-colors duration-150 ease-in mb-2 me-2"
							onClick={() => handleButtonClick("hospital")}
						>
							Hospital
						</button>

						{/* Botón Doctor (mismo estilo que Hospital) */}
						<button
							id="botonDoctor"
							className="px-5 py-2.5 relative rounded-lg border-2 border-sky-blue text-sky-blue bg-transparent text-xl font-medium hover:text-white hover:bg-gradient-to-br from-sky-blue to-blue-400 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 transition-colors duration-150 ease-in mb-2 me-2"
							onClick={() => handleButtonClick("doctor")}
						>
							Doctor
						</button>

						{/* Botón Llamada */}
						<button
							id="botonLlamada"
							// ESTADO INICIAL: Borde verde, texto verde, fondo transparente.
							// ESTADO HOVER: Fondo gradiente verde, texto blanco.
							className="px-5 py-2.5 relative rounded-lg border-2 border-mint-green text-mint-green bg-transparent text-xl font-medium hover:text-white hover:bg-gradient-to-br from-mint-green to-green-400 focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 transition-colors duration-150 ease-in mb-2 me-2"
							onClick={() => navigate("/videocall")} //
						>
							Llamada
						</button>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Inicio;