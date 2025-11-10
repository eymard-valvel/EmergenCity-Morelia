// VideoLlamada.jsx
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// Configuración - Reemplaza con tus credenciales reales
const APP_CONFIG = {
  appID: 895864807,
  serverSecret: "d8ed6d267974fa4c222fba238f9fdc2f",
};

export default function VideoLlamada() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState('');
  const [participants, setParticipants] = React.useState(1);

  const roomID = searchParams.get('room') || 'default-room';
  const userID = searchParams.get('user') || `user_${Date.now()}`;

  const initializeVideoCall = React.useCallback(async (element) => {
    if (!element || isInitialized) return;

    try {
      // Obtener datos del usuario desde localStorage
      const savedData = localStorage.getItem('videoCallData');
      let userData;
      
      if (savedData) {
        userData = JSON.parse(savedData);
      } else {
        userData = {
          roomID: roomID,
          userID: userID,
          userName: `Usuario_${Math.random().toString(36).substr(2, 6)}`
        };
      }

      // Generar token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        APP_CONFIG.appID,
        APP_CONFIG.serverSecret,
        userData.roomID,
        userData.userID,
        userData.userName
      );

      // Crear instancia
      const zp = ZegoUIKitPrebuilt.create(kitToken);

      // Configurar la sala
      zp.joinRoom({
        container: element,
        scenario: {
          mode: ZegoUIKitPrebuilt.GroupCall,
        },
        showPreJoinView: true,
        showTurnOffRemoteCameraButton: true,
        showTurnOffRemoteMicrophoneButton: true,
        showRemoveUserButton: true,
        showTextChat: true,
        showUserList: true,
        lowerLeftNotification: {
          showUserJoinAndLeave: true,
          showTextChat: true,
        },
        sharedLinks: [
          {
            name: 'Enlace de invitación',
            url: `${window.location.origin}${window.location.pathname}?room=${userData.roomID}`,
          },
        ],
        onJoinRoom: () => {
          console.log('Unido a la sala exitosamente');
          setIsInitialized(true);
        },
        onLeaveRoom: () => {
          console.log('Salió de la sala');
          navigate('/videocall');
        },
        onUserJoin: (users) => {
          console.log('Usuario unido:', users);
          setParticipants(prev => prev + 1);
        },
        onUserLeave: (users) => {
          console.log('Usuario salió:', users);
          setParticipants(prev => Math.max(1, prev - 1));
        },
      });

    } catch (err) {
      console.error('Error inicializando videollamada:', err);
      setError('Error al conectar con la videollamada. Verifica tu conexión a internet.');
    }
  }, [roomID, userID, navigate, isInitialized]);

  const salirVideollamada = () => {
    if (window.confirm('¿Estás seguro de que quieres salir de la videollamada?')) {
      navigate('/videocall');
    }
  };

  // Limpiar localStorage al salir
  React.useEffect(() => {
    return () => {
      localStorage.removeItem('videoCallData');
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md w-full">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Error de Conexión</h2>
          <p className="text-gray-600 mb-4 text-sm">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Reintentar Conexión
            </button>
            <button
              onClick={() => navigate('/videocall')}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Volver a Sala de Espera
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-3 sm:p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={salirVideollamada}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Salir
          </button>
          
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold">Videollamada Activa</h1>
            <p className="text-xs text-gray-300">
              Sala: <span className="font-mono">{roomID}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs font-medium">{participants}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-xs hidden sm:inline">
              {isInitialized ? 'Conectado' : 'Conectando...'}
            </span>
          </div>
        </div>
      </div>

      {/* Contenedor de Videollamada */}
      <div 
        className="flex-1 relative"
        ref={initializeVideoCall}
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        {/* Loading State */}
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-medium">Iniciando videollamada...</p>
              <p className="text-gray-400 mt-2 text-sm">Sala: {roomID}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}