import { useNavigate } from "react-router-dom";

const CallButton = () => {
	const navigate = useNavigate();

	return (
		<button
			id="botonMedico"
			className="relative inline-flex items-center justify-center p-0.5 mb-2 me-4 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-orange-400 to-orange-600 group-hover:from-orange-400 group-hover:to-orange-600 hover:text-white focus:ring-4 focus:outline-none focus:ring-orange-200"
			onClick={() => navigate("/")} // Cambia la ruta a la videollamada
		>
			<span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white rounded-md group-hover:bg-opacity-0 text-xl">
				Llamada
			</span>
		</button>
	);
};

export default CallButton;

