import Cookies from "js-cookie";

export const newCookie = ({ name, value }) => {
	Cookies.set(name, value, { expires: 1 / 24, path: "/" });
};

export const getCookie = (name) => {
	return Cookies.get(name);
};

export const deleteCookie = (name) => {
	Cookies.remove(name, { path: "/" });
};
