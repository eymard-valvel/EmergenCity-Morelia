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
{/* --- BOTONES REORGANIZADOS Y ESTILIZADOS --- 👇 */}
<div className="mt-10 flex flex-col items-center">
  <h3 className="text-lg font-semibold text-bluish-gray mb-6 tracking-wide">
    Selecciona tu rol para continuar
  </h3>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Botón Operador */}
    <button
      id="botonOperador"
      className="px-6 py-3 rounded-xl border-2 border-coral-red text-coral-red text-lg font-semibold 
      hover:text-white hover:bg-gradient-to-br from-coral-red to-red-400 
      transition-all duration-300 shadow-md hover:shadow-xl"
      onClick={() => handleButtonClick("operador")}
    >
      Operador
    </button>

    {/* Botón Personal Paramédico */}
    <button
      id="botonParamedico"
      className="px-6 py-3 rounded-xl border-2 border-coral-red text-coral-red text-lg font-semibold 
      hover:text-white hover:bg-gradient-to-br from-coral-red to-red-400 
      transition-all duration-300 shadow-md hover:shadow-xl"
      onClick={() => handleButtonClick("paramedicos")}
    >
      Personal Paramédico
    </button>

    {/* Botón Hospital */}
    <button
      id="botonHospital"
      className="px-6 py-3 rounded-xl border-2 border-sky-blue text-sky-blue text-lg font-semibold 
      hover:text-white hover:bg-gradient-to-br from-sky-blue to-blue-400 
      transition-all duration-300 shadow-md hover:shadow-xl"
      onClick={() => handleButtonClick("hospitales")}
    >
      Hospital
    </button>

    {/* Botón Doctor */}
    <button
      id="botonDoctor"
      className="px-6 py-3 rounded-xl border-2 border-sky-blue text-sky-blue text-lg font-semibold 
      hover:text-white hover:bg-gradient-to-br from-sky-blue to-blue-400 
      transition-all duration-300 shadow-md hover:shadow-xl"
      onClick={() => handleButtonClick("doctor")}
    >
      Doctor
    </button>
  </div>
</div>




				</div>
			</section>
		</div>
	);
};

export default Inicio;