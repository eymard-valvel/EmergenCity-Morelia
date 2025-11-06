import { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import usuario from '../img/usuario.png';
import { API_URL } from '../../auth/constants';
import { useAuth } from '../../auth/AuthProvider';

const Formulario = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [error, setError] = useState("");
    const auth = useAuth();

    if (auth.isAuthenticated) {
        return <navigate to="/ingreso/FormularioIngreso.jsx"></navigate>;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    fechaNacimiento
                }),
            });

            if (response.ok) {
                console.log("User created successfully");
                navigate('/FormularioIngreso');
            } else {
                console.log("Something went wrong");
                const json = await response.json();
                setError(json.error);
            }
        } catch (error) {
            console.error(error);
            setError('Something went wrong');
        }
    }

    // Estilos en línea
    const styles = {
        wrapper: {
            width: '420px',
            background: 'transparent',
            border: '2px solid rgba(255, 255, 255, .2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 10px rgba(0, 0, 0, .2)',
            color: '#fff',
            borderRadius: '8px',
            padding: '30px 40px',
            margin: '0 auto',
            textAlign: 'center',
        },
        titulo: {
            fontSize: '36px',
            margin: '20px 0',
        },
        subtitulo: {
            fontSize: '24px',
        },
        inputBox: {
            margin: '30px 0',
        },
        label: {
            display: 'block',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '20px',
            textAlign: 'left',
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '2px solid rgba(255, 255, 255, .2)',
            borderRadius: '8px',
            background: 'transparent',
            color: '#fff',
        },
        btn: {
            width: '100%',
            background: '#fff',
            color: '#333',
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.3s',
        },
        btnHover: {
            background: '#f0f0f0',
        },
        registerLink: {
            marginTop: '20px',
            textAlign: 'center',
        },
        link: {
            color: '#007BFF',
            cursor: 'pointer',
            textDecoration: 'underline',
        },
        errorMessage: {
            color: 'red',
        }
    };

    return (
        <div style={styles.wrapper}>
            <h1 style={styles.titulo}>Darse de alta</h1>
            <p style={styles.subtitulo}>Realiza el registro llenando el siguiente formulario</p>
            <form className="form" onSubmit={handleSubmit}>
                {error && <div style={styles.errorMessage}>{error}</div>}
                <img className="usuario" src={usuario} alt="Imagen usuario" />
                
                <div style={styles.inputBox}>
                    <label htmlFor="username" style={styles.label}>NOMBRE</label>
                    <input 
                        id="username"
                        type="text"
                        placeholder="Nombre Completo"
                        style={styles.input}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div style={styles.inputBox}>
                    <label htmlFor="email" style={styles.label}>CORREO ELECTRONICO</label>
                    <input 
                        id="email"
                        type="email"
                        placeholder="Correo electronico"
                        style={styles.input}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div style={styles.inputBox}>
                    <label htmlFor="password" style={styles.label}>CONTRASEÑA</label>
                    <input 
                        id="password"
                        type="password"
                        placeholder="Contraseña con más de 5 caracteres"
                        style={styles.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div style={styles.inputBox}>
                    <label htmlFor="fechaNacimiento" style={styles.label}>FECHA NACIMIENTO</label>
                    <input 
                        id="fechaNacimiento"
                        type="date"
                        style={styles.input}
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                    />
                </div>
                
                <input type="submit" 
                    style={styles.btn}
                    value="Registrar"
                />
                
                <h2 style={styles.registerLink}>
                    ¿Ya tienes cuenta? 
                    <button 
                        style={styles.link}
                        onClick={() => navigate('/FormularioIngreso')}
                    >
                        Iniciar Sesión
                    </button>
                </h2>
            </form>
        </div>
    );
}

export default Formulario;
