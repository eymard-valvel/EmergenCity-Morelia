import { Routes, Route, BrowserRouter } from "react-router-dom";
import App from "./App";
import { OperadorFormulario } from "./components/Registro/OperadorFormulario";
import { MapLayout, Mapa, Ambulancias, Hospitales, Operadores, Paramedicos, Medicos } from "./components/Mapa";
import Login from "./components/Ingreso/FormularioIngreso";
import RContrasena from "./components/RecuperacionContraseña/RContrasena";
import NuevaContrasena from "./components/NuevaContrasena/NuevaContrasena";
import ProtectedRoutes from "./components/ProtectedRoutes/ProtectedRoutes";
import { DoctorFormulario } from "./components/Registro/DoctorFormulario";
import { HospitalFormulario } from "./components/Registro/HospitalFormulario";
import { AuthProvider } from "./auth/AuthProvider";
import { ParamedicoFormulario } from "./components/Registro/ParamedicoFormulario";
import VideoCall from "./components/teleconsulta/VideoCall"; // Sala de espera
import VideoLlamada from "./components/teleconsulta/VideoLlamada"; // Videollamada activa
import DoctorLayout from "./components/doctor/DoctorLayout";
import ReportePaciente from "./components/reportepaciente/ReportePaciente";
import ReportesPage from "./components/doctor/ReportesPage";
import MapaOperador from './components/Mapa/MapaOperador';
import MapaHospital from './components/Mapa/MapaHospital';


function Rutas() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<App />} />
					<Route path="mapa" element={<Mapa />} />

					<Route path="/signup">
						<Route path="operador" element={<OperadorFormulario />} />
						<Route path="doctor" element={<DoctorFormulario />} />
						<Route path="hospital" element={<HospitalFormulario />} />
						<Route path="paramedicos" element={<ParamedicoFormulario />} />
					</Route>
					<Route path="/login" element={<Login />} />
					<Route path="/recover-password" element={<RContrasena />} />
					<Route path="/new-password" element={<NuevaContrasena />} />
					
					{/* Rutas públicas de videollamadas */}
					<Route path="/videocall" element={<VideoCall />} /> {/* Sala de espera */}
					<Route path="/videollamada" element={<VideoLlamada />} /> {/* Videollamada activa */}

					<Route element={<ProtectedRoutes />}>
						<Route element={<MapLayout />}>
							<Route path="ambulancias" element={<Ambulancias />} />
							<Route path="paramedicos" element={<Paramedicos />} />
							<Route path="hospital" element={<Hospitales />} />
							<Route path="operadores" element={<Operadores />} />
							<Route path="medicos" element={<Medicos />} />
							{/* Nueva ruta de navegación GPS dentro del layout del mapa */}
							<Route path="navegaciongps" element={<MapaOperador />} />
							<Route path="navmapa" element={<MapaHospital />} /> 
							<Route path="navegacion" element={<Mapa />} /> {/* Mantenemos Mapa pero con funcionalidad de navegación */}
						</Route>
						<Route element={<DoctorLayout />} path="/doctor">
							<Route path="records" element={<ReportesPage />} />
						</Route>
						<Route element={<ReportePaciente />} path="/reportepaciente"></Route>	
					</Route>
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}

export default Rutas;