import { useNavigate } from "react-router-dom";
import usuario from '../img/formularioRecuperarContrasenaIcono.png';
import logo from '../img/Logo.png'; // Asegúrate de que el logo esté en la carpeta correcta


const RContrasena = () => {
			const navigate = useNavigate();
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
								style={{ width: "100%", height: "100%",  maxWidth: "300px", maxHeight: "300px" }}
								className="mt-20 mb-4"
								/>
							</div>
		
							{/* Sección Derecha - Formulario Recuperar Contraseña */}
							{/* Sección Derecha - Formulario de Registro */}
						<div className="w-2/3 p-8">
								<h1 className="font-black text-3xl text-center text-transparent bg-clip-text bg-gradient-to-r from-[#002D62] to-[#74C2E1]">
									RECUPERAR CONTRASEÑA
								</h1>
		
								<form  className="mt-16 space-y-5">
		
									{/* Campo: Correo */}
									<div>
										<label
										htmlFor="email"
										className="block text-blue-950 dark:text-gray-200 uppercase font-bold text-2xl text-left"
										>
										CORREO ELECTRONICO
										</label>
										<input
										id="email"
										type="email"
										placeholder="Correo electrónico"
										className="mt-2 border-2 w-full p-2 placeholder-stone-400 rounded-md"
										/>
									</div>
		
									{/* Botón de envío */}
									<input
										type="submit"
										className="rounded-md bg-cyan-500 p-3 text-white uppercase font-bold hover:bg-cyan-300 transition-colors w-full mt-5"
										value="Enviar"
									/>
		
									{/* Enlace de inicio de sesión */}
								<div className="flex justify-center mt-10 dark:text-gray-600">
								<h2 className="font-medium">
											¿Volver a la página principal?
											<button
												className="font-medium text-blue-600 dark:text-blue-500 hover:underline ml-2 mt-2"
												onClick={() => navigate("/")}
											>
												Volver a Inicio
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
	
export default RContrasena;
