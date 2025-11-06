/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: { // Añade o modifica esta sección 'colors'
				'coral-red': '#FF5252',
				'sky-blue': '#40C4FF',
				'bluish-gray': '#263238',
				'smoke-white': '#F5F5F5',
				'mint-green': '#81C784',
				// Puedes mantener o eliminar los colores existentes si no los necesitas
			},
			backgroundImage: { // Mantén o modifica gradientes si es necesario
				"text-gradient": "linear-gradient(50deg, #40C4FF 0%, #FF5252 100%)" // Ejemplo usando los nuevos colores
			}
		}
	},
	plugins: []
};