import type { Database } from "bun:sqlite";
import { closeDatabase, getDatabase } from "@lib/db";
import { createContext, type ReactNode, useEffect } from "react";

export const DatabaseContext = createContext<Database | null>(null);

interface DatabaseProviderProps {
	children: ReactNode;
	path?: string;
}

export function DatabaseProvider({ children, path }: DatabaseProviderProps) {
	const db = getDatabase(path);

	useEffect(() => {
		return () => {
			closeDatabase();
		};
	}, []);

	return (
		<DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
	);
}
