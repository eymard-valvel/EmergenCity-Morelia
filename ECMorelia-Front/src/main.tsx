import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Rutas from "./Rutas";

// Aquí se importan los estilos de PrimeReact y PrimeIcons
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Rutas />
	</React.StrictMode>
);
