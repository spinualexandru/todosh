import type { Database } from "bun:sqlite";
import { DatabaseContext } from "@contexts/database";
import { useContext } from "react";

export function useDatabase(): Database {
	const context = useContext(DatabaseContext);
	if (!context) {
		throw new Error("useDatabase must be used within a DatabaseProvider");
	}
	return context;
}
