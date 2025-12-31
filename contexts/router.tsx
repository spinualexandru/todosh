import type { Route, RouterContextValue } from "@types";
import { createContext, type ReactNode, useCallback, useState } from "react";

export const RouterContext = createContext<RouterContextValue | null>(null);

interface RouterProviderProps {
	children: ReactNode;
	initialRoute?: Route;
}

export function RouterProvider({
	children,
	initialRoute = { view: "dashboard" },
}: RouterProviderProps) {
	const [current, setCurrent] = useState<Route>(initialRoute);
	const [history, setHistory] = useState<Route[]>([]);

	const navigate = useCallback((route: Route) => {
		setCurrent((prev) => {
			setHistory((h) => [...h, prev]);
			return route;
		});
	}, []);

	const goBack = useCallback(() => {
		setHistory((prev) => {
			if (prev.length === 0) return prev;
			const newHistory = [...prev];
			const lastRoute = newHistory.pop();
			if (lastRoute) {
				setCurrent(lastRoute);
			}
			return newHistory;
		});
	}, []);

	const canGoBack = history.length > 0;

	return (
		<RouterContext.Provider
			value={{ route: current, navigate, goBack, canGoBack }}
		>
			{children}
		</RouterContext.Provider>
	);
}
