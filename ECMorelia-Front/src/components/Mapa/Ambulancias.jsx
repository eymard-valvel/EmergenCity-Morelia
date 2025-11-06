import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../img/Logo.png";
import usuario from "../img/usuario.png";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { useFecthData } from "./useFetchData";
import { InputSwitch } from "primereact/inputswitch";

export default function Ambulancias() {
	const [ambulancias, setAmbulancias] = useState();
	const { addRecord, getAllRecord, updateRecord, deleteRecord } = useFecthData("ambulancias");
	const [checked, setChecked] = useState(false);
	const [dialogVisible, setDialogVisible] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [newAmbulancia, setNewAmbulancia] = useState({ numero_placa_sm: "", modelo: "", disponible: "" });

	useEffect(() => {
		const fetchData = async () => {
			const data = await getAllRecord();
			setAmbulancias(data);
		};

		fetchData();
	}, []);

	// Función para abrir el diálogo para agregar o editar ambulancia
	const openDialog = (ambulancia = { numero_placa_sm: "", modelo: "", disponible: "" }) => {
		setNewAmbulancia(ambulancia);
		setEditMode(!!ambulancia.numero_placa_sm);
		setDialogVisible(true);
	};

	// Función para agregar o editar ambulancia
	const saveAmbulancia = async () => {
		if (editMode) {
			setAmbulancias(
				ambulancias.map((ambulancia) =>
					ambulancia.numero_placa_sm === newAmbulancia.numero_placa_sm ? newAmbulancia : ambulancia
				)
			);
			await updateRecord({ id: newAmbulancia.numero_placa_sm, data: newAmbulancia });
		} else {
			setAmbulancias([...ambulancias, { ...newAmbulancia }]);
			await addRecord(newAmbulancia);
		}
		setDialogVisible(false);
	};

	// Función para eliminar ambulancia
	const deleteAmbulancia = async (id) => {
		await deleteRecord(id);
		setAmbulancias(ambulancias.filter((a) => a.id !== id));
	};

	return (
		<div>
			<h2 className="flex justify-center items-center text-2xl mt-6 font-semibold dark:text-gray-200">
				Gestión de Ambulancias
			</h2>

			<div className="flex justify-end mb-3 mt-3">
				<button
					className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 group-hover:from-green-400 group-hover:to-blue-600 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800"
					onClick={() => openDialog()}
				>
					<span className="relative px-10 py-1.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
						Agregar Ambulancia
					</span>
				</button>
			</div>

			{/* Centrado del CRUD */}
			<div className="flex justify-center">
				<div className="w-3/4 bg-red-800">
					<DataTable value={ambulancias} responsiveLayout="scroll">
						<Column field="numero_placa_sm" header="Placa" />
						<Column field="modelo" header="Modelo" />
						<Column field="disponible" header="Disponible" className="capitalize" />

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
										onClick={() => deleteAmbulancia(rowData.numero_placa_sm)}
									>
										<i className="pi pi-trash"></i>
									</button>
								</div>
							)}
						/>
					</DataTable>
				</div>
			</div>

			{/* Diálogo para agregar/editar ambulancia */}
			<Dialog
				header={editMode ? "Editar Ambulancia" : "Agregar Ambulancia"}
				visible={dialogVisible}
				style={{ width: "50vw" }}
				onHide={() => setDialogVisible(false)}
			>
				<div className="p-field mt-2">
					<label htmlFor="numero_placa_sm" className="block mb-1">
						Placa
					</label>
					<InputText
						id="numero_placa_sm"
						value={newAmbulancia.numero_placa_sm}
						onChange={(e) => setNewAmbulancia({ ...newAmbulancia, numero_placa_sm: e.target.value })}
						className="p-inputtext w-full mb-2 bg-neutral-100"
					/>
				</div>
				<div className="p-field mt-2">
					<label htmlFor="modelo" className="block mb-1">
						Modelo
					</label>
					<InputText
						id="modelo"
						value={newAmbulancia.modelo}
						onChange={(e) => setNewAmbulancia({ ...newAmbulancia, modelo: e.target.value })}
						className="p-inputtext w-full mb-2 bg-neutral-100"
					/>
				</div>
				<div className="p-field mt-2">
					<label htmlFor="disponible" className="block mb-1">
						Disponible
					</label>
					<InputSwitch
						id="disponible"
						checked={newAmbulancia.disponible === "si"}
						onChange={(e) => {
							setChecked(e.value);
							setNewAmbulancia({ ...newAmbulancia, disponible: e.target.value ? "si" : "no" });
						}}
					/>
				</div>

				<div className="p-dialog-footer flex justify-center space-x-2 mt-3">
					<button
						className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
						onClick={saveAmbulancia}
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
