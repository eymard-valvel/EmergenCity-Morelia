const NuevaContrasena = () => {
	return (
		//declaramos el contenedor que tendrá el header y formulario. La primera parte es el header y dentro del form viene el formulario
		<div className="container max-w-md mx-auto text-center">
			<h1 className="font-black text-5xl text-center mt-9 text-neutral-900">INGRESA NUEVA</h1>
			<span></span> <h1 className="font-black text-5xl text-center text-cyan-500">CONTRASEÑA</h1>
			<form className="bg-gray-300 rounded-lg py-10 px-5 mt-5 shadow-lg">
				<div className="mt-5">
					<label htmlFor="email" className="ml-10 block text-blue-950 uppercase font-bold text-xl text-left">
						CONTRASEÑA NUEVA
					</label>
					<input
						id="Contrasena"
						type="password"
						placeholder="Ingresa la nueva contraseña"
						className="ml-29 mt-2 border-2 w-80 p-2 mt-2 placeholder-stone-400 rounded-md "
					/>
				</div>
				<div className="mt-5">
					<label htmlFor="email" className="ml-10 block text-blue-950 uppercase font-bold text-left text-xl">
						CONFIRMAR CONTRASEÑA NUEVA
					</label>
					<input
						id="ConfirmarContrasena"
						type="password"
						placeholder="Ingresa nuevamente la contraseña"
						className="ml-29 mt-2 border-2 w-80 p-2 mt-2 placeholder-stone-400 rounded-md "
					/>
				</div>

				<input
					type="submit"
					className="rounded-md bg-cyan-500 p-3 text-white uppercase font-bold hover:bg-cyan-300 transition-colors w-80 mt-5 "
					value="Confirmar "
				/>
			</form>
		</div>
	);
};
export default NuevaContrasena;
