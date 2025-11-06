import { createContext, useEffect, useState } from "react";
import { getCookie } from "../helpers/cookies";

export const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		const role = getCookie("role");

		if (role) {
			setIsAuthenticated(role);
		} else {
			setIsAuthenticated(null);
		}
		setLoading(false);
	}, []);

	const setAuth = (state) => {
		setIsAuthenticated(state);
	};

	return <AuthContext.Provider value={{ isAuthenticated, setAuth, loading }}>{children}</AuthContext.Provider>;
};
