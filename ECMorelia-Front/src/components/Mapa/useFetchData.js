import { useEffect } from "react";

export const useFecthData = (path) => {
	const addRecord = async (data) => {
		console.log(data);

		try {
			const request = await fetch(`${import.meta.env.VITE_API}/${path}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(data)
			});

			return await request.json();
		} catch (error) {
			throw new Error({ meesage: error.message });
		}
	};

	const getAllRecord = async () => {
		const request = await fetch(`${import.meta.env.VITE_API}/${path}`);
		return await request.json();
	};

	const updateRecord = async ({ id, data }) => {
		try {
			const request = await fetch(`${import.meta.env.VITE_API}/${path}/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(data)
			});
			return await request.json();
		} catch (error) {
			throw new Error(error.message);
		}
	};

	const deleteRecord = async (id) => {
		try {
			await fetch(`${import.meta.env.VITE_API}/${path}/${id}`, {
				method: "DELETE"
			});
		} catch (error) {
			throw new Error(error.message);
		}
	};

	return {
		addRecord,
		getAllRecord,
		updateRecord,
		deleteRecord
	};
};
