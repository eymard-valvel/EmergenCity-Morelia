import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',      // Permite conexiones desde cualquier IP
    port: 5173,           // Puerto del frontend
    strictPort: false,
    allowedHosts: [       // Dominios permitidos
      'localhost',
      '.local',
      '127.0.0.1'
    ],
    // Headers para permisos de geolocalización
    headers: {
      'Permissions-Policy': 'geolocation=*',
      'Feature-Policy': 'geolocation *'
    }
  },
  // Para definir variables globales
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"development"'
  },
  // Configuración de build para producción
  build: {
    target: 'esnext',
    sourcemap: true
  }
});