import App from "./App.jsx";
import { ChakraProvider, theme } from "@chakra-ui/react";

export default function Mapa() {
	return (
		<div>
			<ChakraProvider theme={theme}>
				<App />
			</ChakraProvider>
		</div>
	);
}
