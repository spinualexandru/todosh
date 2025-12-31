import type { Board, BoardWithStats } from "@types";
import { useCallback, useEffect, useState } from "react";
import { useDatabase } from "./useDatabase";

interface CreateBoardInput {
	name: string;
	description?: string;
}

interface UpdateBoardInput {
	name?: string;
	description?: string;
}

export function useBoards() {
	const db = useDatabase();
	const [boards, setBoards] = useState<BoardWithStats[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchBoards = useCallback(() => {
		const query = db.query<BoardWithStats, []>(`
			SELECT
				b.*,
				COUNT(t.id) as taskCount,
				SUM(CASE WHEN t.status = 'todo' AND t.archived = 0 THEN 1 ELSE 0 END) as todoCount,
				SUM(CASE WHEN t.status = 'doing' AND t.archived = 0 THEN 1 ELSE 0 END) as doingCount,
				SUM(CASE WHEN t.status = 'done' AND t.archived = 0 THEN 1 ELSE 0 END) as doneCount
			FROM boards b
			LEFT JOIN tasks t ON t.board_id = b.id
			WHERE b.archived = 0
			GROUP BY b.id
			ORDER BY b.updated_at DESC
		`);
		const results = query.all();
		setBoards(results);
		setIsLoading(false);
	}, [db]);

	useEffect(() => {
		fetchBoards();
	}, [fetchBoards]);

	const createBoard = useCallback(
		(input: CreateBoardInput): Board => {
			const stmt = db.query<Board, [string, string]>(`
				INSERT INTO boards (name, description)
				VALUES (?, ?)
				RETURNING *
			`);
			const board = stmt.get(input.name, input.description ?? "");
			if (!board) throw new Error("Failed to create board");
			fetchBoards();
			return board;
		},
		[db, fetchBoards],
	);

	const updateBoard = useCallback(
		(id: number, input: UpdateBoardInput): Board | null => {
			const updates: string[] = [];
			const values: (string | number)[] = [];

			if (input.name !== undefined) {
				updates.push("name = ?");
				values.push(input.name);
			}
			if (input.description !== undefined) {
				updates.push("description = ?");
				values.push(input.description);
			}

			if (updates.length === 0) return null;

			updates.push("updated_at = datetime('now')");
			values.push(id);

			const stmt = db.query<Board, (string | number)[]>(`
				UPDATE boards
				SET ${updates.join(", ")}
				WHERE id = ?
				RETURNING *
			`);
			const board = stmt.get(...values);
			fetchBoards();
			return board ?? null;
		},
		[db, fetchBoards],
	);

	const deleteBoard = useCallback(
		(id: number): boolean => {
			const stmt = db.query<null, [number]>(`
				DELETE FROM boards WHERE id = ?
			`);
			stmt.run(id);
			fetchBoards();
			return true;
		},
		[db, fetchBoards],
	);

	const archiveBoard = useCallback(
		(id: number): boolean => {
			const stmt = db.query<null, [number]>(`
				UPDATE boards
				SET archived = 1, updated_at = datetime('now')
				WHERE id = ?
			`);
			stmt.run(id);
			fetchBoards();
			return true;
		},
		[db, fetchBoards],
	);

	const getBoard = useCallback(
		(id: number): Board | null => {
			const stmt = db.query<Board, [number]>(`
				SELECT * FROM boards WHERE id = ? AND archived = 0
			`);
			return stmt.get(id) ?? null;
		},
		[db],
	);

	return {
		boards,
		isLoading,
		createBoard,
		updateBoard,
		deleteBoard,
		archiveBoard,
		getBoard,
		refresh: fetchBoards,
	};
}
