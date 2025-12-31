import { RouterContext } from "@contexts/router";
import { useContext } from "react";

export function useRouter() {
	const context = useContext(RouterContext);
	if (!context) {
		throw new Error("useRouter must be used within a RouterProvider");
	}
	return context;
}
