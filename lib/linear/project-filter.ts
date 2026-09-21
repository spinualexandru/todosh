import type { Database } from "bun:sqlite";

import type { Board, Task } from "@types";

export function cachedProjects(
	db: Database,
	boardId: number,
): { id: string; name: string }[] {
	return db
		.query<{ id: string; name: string }, [number]>(
			"SELECT id,name FROM board_projects WHERE board_id=? ORDER BY name COLLATE NOCASE,id",
		)
		.all(boardId);
}

/** A view preference only: no API requests, task mutations, or connection changes. */
export function setProjectFilter(
	db: Database,
	boardId: number,
	projectId: string | null,
): Board {
	const board = db
		.query<Board, [number]>(
			"SELECT * FROM boards WHERE id=? AND source='linear'",
		)
		.get(boardId);
	if (!board) throw new Error("Linear: board not found.");
	const project = projectId
		? cachedProjects(db, boardId).find((p) => p.id === projectId)
		: undefined;
	if (projectId && !project)
		throw new Error(
			"Linear: project is not cached. Press r to refresh the team.",
		);
	const updated = db
		.query<Board, [string | null, string | null, number]>(
			"UPDATE boards SET project_filter_id=?, project_filter_name=? WHERE id=? RETURNING *",
		)
		.get(projectId, project?.name ?? null, boardId);
	if (!updated) throw new Error("Linear: board not found.");
	return updated;
}

export function cachedTasks(db: Database, boardId: number): Task[] {
	return db
		.query<
			Task,
			[number]
		>(`SELECT t.* FROM tasks t JOIN boards b ON b.id=t.board_id
 WHERE t.board_id=? AND t.archived=0 AND
 (b.source!='linear' OR b.project_filter_id IS NULL OR t.linear_project_id=b.project_filter_id)
 ORDER BY t.status,t.position,t.created_at DESC`)
		.all(boardId);
}
