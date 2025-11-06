import { useState, useEffect } from "react";
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

export default function Paramedicos() {
	const { addRecord, deleteRecord, getAllRecord, updateRecord } = useFecthData("paramedico");
	const [paramedicos, setParamedicos] = useState();
	const [dialogVisible, setDialogVisible] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [newParamedico, setNewParamedico] = useState({
		licencia_medica: "",
		nombre: "",
		apellidos: "",
		licencia_medica: "",
		licencia_conducir: "",
		certificado: ""
	});

	useEffect(() => {
		const fetchData = async () => {
			const data = await getAllRecord();
			setParamedicos(data);
		};

		fetchData();
	}, []);

	const openDialog = (
		paramedico = {
			nombre: "",
			apellidos: "",
			licencia_medica: "",
			licencia_conducir: "",
			certificado: ""
		}
	) => {
		setNewParamedico(paramedico);
		setEditMode(!!paramedico.licencia_medica);
		setDialogVisible(true);
	};

	const saveParamedico = async () => {
		if (editMode) {
			setParamedicos(
				paramedicos.map((paramedico) =>
					paramedico.licencia_medica === newParamedico.licencia_medica ? newParamedico : paramedico
				)
			);
			await updateRecord({ id: newParamedico.licencia_medica, data: newParamedico });
		} else {
			setParamedicos([...paramedicos, { ...newParamedico }]);
			await addRecord(newParamedico);
		}
		setDialogVisible(false);
	};

	const deleteParamedico = async (id) => {
		await deleteRecord(id);
		setParamedicos(paramedicos.filter((paramedicos) => paramedicos.licencia_medica !== id));
	};

	return (
		<div>
			<h2 className="flex justify-center items-center text-2xl mt-6 font-semibold dark:text-gray-200">
				Gestión de Paramédicos
			</h2>

			<div className="flex justify-end mb-3 mt-3">
				<button
					className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 hover:text-white dark:text-white"
					onClick={() => openDialog()}
				>
					<span className="relative px-10 py-1.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
						Agregar Paramédico
					</span>
				</button>
			</div>

			<div className="flex justify-center">
				<div className="w-3/4">
					<DataTable value={paramedicos} responsiveLayout="scroll">
						<Column field="licencia_medica" header="ID" />
						<Column field="nombre" header="Nombre" />
						<Column field="apellidos" header="Apellidos" />
						{/* <Column field="certificado" header="Certificado" /> */}
						<Column field="licencia_conducir" header="Licencia Conducir" />
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
										onClick={() => deleteParamedico(rowData.licencia_medica)}
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
				header={editMode ? "Editar Paramédico" : "Agregar Paramédico"}
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
						value={newParamedico.nombre}
						onChange={(e) => setNewParamedico({ ...newParamedico, nombre: e.target.value })}
						className="p-inputtext w-full mb-2 bg-neutral-100"
					/>
				</div>

				<div className="p-field mt-2">
					<label htmlFor="apellidos" className="block mb-1">
						Apellidos
					</label>
					<InputText
						id="apellidos"
						value={newParamedico.apellidos}
						onChange={(e) => setNewParamedico({ ...newParamedico, apellidos: e.target.value })}
						className="p-inputtext w-full mb-2 bg-neutral-100"
					/>
				</div>

				<div className="p-field mt-2">
					<label htmlFor="licencia_conducir" className="block mb-1">
						Licencia Conducir
					</label>
					<InputText
						id="licencia_conducir"
						value={newParamedico.licencia_conducir}
						onChange={(e) => setNewParamedico({ ...newParamedico, licencia_conducir: e.target.value })}
						className="p-inputtext w-full mb-2 bg-neutral-100"
					/>
				</div>

				<div className="p-field mt-2">
					<label htmlFor="licencia_medica" className="block mb-1">
						Licencia Medica
					</label>
					<InputText
						id="licencia_medica"
						value={newParamedico.licencia_medica}
						onChange={(e) => setNewParamedico({ ...newParamedico, licencia_medica: e.target.value })}
						className="p-inputtext w-full mb-2 bg-neutral-100"
					/>
				</div>

				<div className="p-field mt-2">
					<label htmlFor="certificado" className="block mb-1">
						Certificado
					</label>
					<InputText
						id="certificado"
						value={newParamedico.certificado}
						onChange={(e) => setNewParamedico({ ...newParamedico, certificado: e.target.value })}
						className="p-inputtext w-full mb-2 bg-neutral-100"
					/>
				</div>

				<div className="p-dialog-footer flex justify-center space-x-2 mt-3">
					<button
						className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
						onClick={saveParamedico}
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
