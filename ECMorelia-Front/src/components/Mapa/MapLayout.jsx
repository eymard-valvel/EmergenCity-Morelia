import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import Header from "./Header";

export default function MapLayout() {
	return (
		<div>
			<Header />
			<Outlet />
		</div>
	);
}
