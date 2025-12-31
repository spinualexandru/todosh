import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getDatabasePath } from "@utils/paths";
import { SCHEMA } from "./schema";

let db: Database | null = null;

export function getDatabase(customPath?: string): Database {
	if (db) return db;

	const dbPath = customPath ?? getDatabasePath();
	const dbDir = dirname(dbPath);

	if (!existsSync(dbDir)) {
		mkdirSync(dbDir, { recursive: true });
	}

	db = new Database(dbPath, { create: true });
	db.exec("PRAGMA foreign_keys = ON;");
	db.exec(SCHEMA);

	return db;
}

export function closeDatabase(): void {
	if (db) {
		db.close();
		db = null;
	}
}
