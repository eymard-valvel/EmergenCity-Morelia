import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import Logo from "../Login/Logo";

export default function ProtectedRoutes() {
	const { loading, isAuthenticated } = useAuth();

	if (loading) {
		return (
			<div className="dark:text-gray-200 w-dvw h-dvh flex flex-col items-center justify-center">
				<Logo />
				<p className="text-lg md:text-xl lg:text-3xl">EMERGENCITY</p>
			</div>
		);
	}

	return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
}
