// SalaEspera.jsx
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

// Generador de códigos de sala mejorado
const generateRoomCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generador de ID de usuario único
const generateUserID = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generador de nombre de usuario aleatorio
const generateRandomName = () => {
  const names = ['Alex', 'Maria', 'Carlos', 'Laura', 'David', 'Ana', 'Javier', 'Sofia', 'Miguel', 'Elena'];
  const surnames = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Perez', 'Gonzalez', 'Sanchez', 'Ramirez', 'Torres', 'Flores'];
  return `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`;
};

export default function SalaEspera() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = React.useState('');
  const [userName, setUserName] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  // Generar código de sala automáticamente al montar
  React.useEffect(() => {
    setRoomCode(generateRoomCode());
    // Sugerir un nombre aleatorio
    setUserName(generateRandomName());
  }, []);

  const crearSala = () => {
    if (!userName.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    setIsCreating(true);
    const userData = {
      roomID: roomCode,
      userID: generateUserID(),
      userName: userName.trim(),
      timestamp: Date.now()
    };

    // Guardar en localStorage para usar en la videollamada
    localStorage.setItem('videoCallData', JSON.stringify(userData));
    
    // Navegar a la videollamada después de un breve delay
    setTimeout(() => {
      navigate(`/videollamada?room=${roomCode}&user=${userData.userID}`);
    }, 500);
  };

  const unirseSala = () => {
    const code = roomCode.trim().toUpperCase();
    if (!code || !userName.trim()) {
      alert('Por favor ingresa tanto el código de sala como tu nombre');
      return;
    }

    // Validar formato del código (solo letras y números)
    if (!/^[A-Z0-9]{4,10}$/.test(code)) {
      alert('El código de sala debe contener solo letras y números (4-10 caracteres)');
      return;
    }

    const userData = {
      roomID: code,
      userID: generateUserID(),
      userName: userName.trim(),
      timestamp: Date.now()
    };

    localStorage.setItem('videoCallData', JSON.stringify(userData));
    navigate(`/videollamada?room=${code}&user=${userData.userID}`);
  };

  const regenerarCodigo = () => {
    setRoomCode(generateRoomCode());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (roomCode && userName) {
        unirseSala();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Sala de Videollamada
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Crear o unirse a una videollamada segura
          </p>
        </div>

        <div className="space-y-4">
          {/* Input Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu Nombre
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ingresa tu nombre completo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
            />
          </div>

          {/* Input Código de Sala */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Código de Sala
              </label>
              <button
                onClick={regenerarCodigo}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerar
              </button>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Código de 8 caracteres"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-center text-base sm:text-lg tracking-wider"
                maxLength={8}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Comparte este código con los participantes
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="space-y-2 pt-2">
            <button
              onClick={crearSala}
              disabled={isCreating || !userName.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isCreating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando Sala...
                </span>
              ) : (
                'Crear Nueva Sala'
              )}
            </button>

            <button
              onClick={unirseSala}
              disabled={!userName.trim() || !roomCode.trim()}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Unirse a Sala Existente
            </button>
          </div>

          {/* Información */}
          <div className="bg-blue-50 rounded-lg p-3 mt-4">
            <h3 className="font-semibold text-blue-800 mb-2 text-sm">
              ¿Cómo funciona?
            </h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Crea una sala con código único</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Comparte el código con participantes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Videollamada segura y encriptada</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Compatible con cualquier dispositivo</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}