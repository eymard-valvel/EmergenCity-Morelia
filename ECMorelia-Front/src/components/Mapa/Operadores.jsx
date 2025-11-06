import { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { useNavigate } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import logo from "../img/Logo.png";
import usuario from "../img/usuario.png";
import { useFecthData } from "./useFetchData";
import { Dropdown } from "primereact/dropdown";

export default function Operadores() {
	const [operadores, setOperadores] = useState();
	const [dialogVisible, setDialogVisible] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [newOperador, setNewOperador] = useState({ nombre: "", licencia_medica: "", turno: "" });
	const { addRecord, deleteRecord, getAllRecord, updateRecord } = useFecthData("operador");

	useEffect(() => {
		const fetchData = async () => {
			const data = await getAllRecord();
			setOperadores(data);
		};

		fetchData();
	}, []);

	const openDialog = (operador = { nombre: "", licencia_medica: "", turno: "" }) => {
		setNewOperador(operador);
		setEditMode(!!operador.id);
		setDialogVisible(true);
	};

	const saveOperador = async () => {
		if (editMode) {
			setOperadores(operadores.map((o) => (o.id === newOperador.id ? newOperador : o)));
			await updateRecord({ id: newOperador.licencia_medica, data: newOperador });
		} else {
			setOperadores([...operadores, { ...newOperador }]);
			await addRecord(newOperador);
		}
		setDialogVisible(false);
	};

	const deleteOperador = async (id) => {
		await deleteRecord(id);
		setOperadores(operadores.filter((o) => o.licencia_medica !== id));
	};

	return (
		<div>
			<h2 className="flex justify-center items-center text-2xl mt-6 font-semibold dark:text-gray-200">
				Gestión de Operadores
			</h2>

			<div className="flex justify-end mb-3 mt-3">
				<button
					className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 hover:text-white dark:text-white"
					onClick={() => openDialog()}
				>
					<span className="relative px-10 py-1.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
						Agregar Operador
					</span>
				</button>
			</div>

			<div className="flex justify-center">
				<div className="w-3/4">
					<DataTable value={operadores} responsiveLayout="scroll">
						<Column field="nombre" header="Nombre" />
						<Column field="turno" header="Turno" />
						<Column field="licencia_medica" header="Licencia Medica" />

						<Column
							header="Acciones"
							body={(rowData) => (
								<div className="flex">
									<button
										className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-2 rounded-md mr-2 w-10 h-10 flex justify-center items-center"
										onClick={() => openDialog(rowData)}
									>
										<i className="pi pi-pencil"></i>
									</button>
									<button
										className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-2 rounded-md w-10 h-10 flex justify-center items-center"
										onClick={() => deleteOperador(rowData.licencia_medica)}
									>
										<i className="pi pi-trash"></i>
									</button>
								</div>
							)}
						/>
					</DataTable>
				</div>
			</div>

			<Dialog
				header={editMode ? "Editar Operador" : "Agregar Operador"}
				visible={dialogVisible}
				style={{ width: "50vw" }}
				onHide={() => setDialogVisible(false)}
			>
				<div className="p-field mt-2">
					<label htmlFor="nombre" className="block mb-1">
						Nombre
					</label>
					<InputText
						id="nombre"
						value={newOperador.nombre}
						onChange={(e) => setNewOperador({ ...newOperador, nombre: e.target.value })}
						className="p-inputtext w-full mb-2 bg-gray-100"
					/>
				</div>

				<div className="p-field mt-2">
					<label htmlFor="licencia_medica" className="block mb-1">
						Licencia Medica
					</label>
					<InputText
						id="licencia_medica"
						value={newOperador.licencia_medica}
						onChange={(e) => setNewOperador({ ...newOperador, licencia_medica: e.target.value })}
						className="p-inputtext w-full mb-2 bg-gray-100"
					/>
				</div>

				<div className="p-field mt-2">
					<label htmlFor="turno" className="block mb-1">
						Turno
					</label>
					<Dropdown
						value={newOperador.turno}
						onChange={(e) => setNewOperador({ ...newOperador, turno: e.target.value })}
						options={["diurno", "nocturno"]}
						optionLabel="turno"
						placeholder="Seleciona un turno"
						className="w-full md:w-14rem"
					/>
				</div>

				<div className="p-dialog-footer flex justify-center space-x-2 mt-3">
					<button
						className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
						onClick={saveOperador}
					>
						<i className="pi pi-check"></i> Guardar
					</button>
					<button
						className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
						onClick={() => setDialogVisible(false)}
					>
						<i className="pi pi-times"></i> Cancelar
					</button>
				</div>
			</Dialog>
		</div>
	);
}
