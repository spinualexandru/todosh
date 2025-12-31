import { getDatabase } from "@lib/db/connection";
import type { Board, Task } from "@types";
import { error, type IpcRequest, type IpcResponse, success } from "./protocol";

export function handleRequest(request: IpcRequest): IpcResponse {
	const db = getDatabase();

	switch (request.type) {
		case "ping":
			return success({ pong: true, pid: process.pid });

		case "boards:list": {
			const boards = db
				.query<Board, []>(
					"SELECT * FROM boards WHERE archived = 0 ORDER BY name",
				)
				.all();
			return success({ boards });
		}

		case "boards:get": {
			const board = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(request.id);
			if (!board) {
				return error(`Board not found: ${request.id}`);
			}
			return success({ board });
		}

		case "boards:create": {
			const result = db
				.query<{ id: number }, [string, string]>(
					"INSERT INTO boards (name, description) VALUES (?, ?) RETURNING id",
				)
				.get(request.name, request.description ?? "");
			if (!result) {
				return error("Failed to create board");
			}
			const board = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(result.id);
			return success({ board });
		}

		case "boards:update": {
			const existing = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(request.id);
			if (!existing) {
				return error(`Board not found: ${request.id}`);
			}
			db.query(
				"UPDATE boards SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?",
			).run(
				request.name ?? existing.name,
				request.description ?? existing.description,
				request.id,
			);
			const board = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(request.id);
			return success({ board });
		}

		case "boards:delete": {
			const existing = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(request.id);
			if (!existing) {
				return error(`Board not found: ${request.id}`);
			}
			db.query("DELETE FROM boards WHERE id = ?").run(request.id);
			return success({ deleted: true });
		}

		case "tasks:list": {
			let query = "SELECT * FROM tasks WHERE archived = 0";
			const params: (number | string)[] = [];

			if (request.boardId !== undefined) {
				query += " AND board_id = ?";
				params.push(request.boardId);
			}
			if (request.status !== undefined) {
				query += " AND status = ?";
				params.push(request.status);
			}
			query += " ORDER BY position, created_at";

			const tasks = db.query<Task, (number | string)[]>(query).all(...params);
			return success({ tasks });
		}

		case "tasks:get": {
			const task = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(request.id);
			if (!task) {
				return error(`Task not found: ${request.id}`);
			}
			return success({ task });
		}

		case "tasks:create": {
			const board = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(request.boardId);
			if (!board) {
				return error(`Board not found: ${request.boardId}`);
			}

			const maxPos = db
				.query<{ max: number | null }, [number, string]>(
					"SELECT MAX(position) as max FROM tasks WHERE board_id = ? AND status = ?",
				)
				.get(request.boardId, request.status ?? "todo");

			const result = db
				.query<
					{ id: number },
					[number, string, string, string, string, number]
				>(
					`INSERT INTO tasks (board_id, title, description, status, priority, position)
					 VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
				)
				.get(
					request.boardId,
					request.title,
					request.description ?? "",
					request.status ?? "todo",
					request.priority ?? "medium",
					(maxPos?.max ?? -1) + 1,
				);

			if (!result) {
				return error("Failed to create task");
			}
			const task = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(result.id);
			return success({ task });
		}

		case "tasks:update": {
			const existing = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(request.id);
			if (!existing) {
				return error(`Task not found: ${request.id}`);
			}

			db.query(
				`UPDATE tasks SET
					title = ?,
					description = ?,
					status = ?,
					priority = ?,
					due_date = ?,
					updated_at = datetime('now')
				 WHERE id = ?`,
			).run(
				request.title ?? existing.title,
				request.description ?? existing.description,
				request.status ?? existing.status,
				request.priority ?? existing.priority,
				request.dueDate !== undefined ? request.dueDate : existing.due_date,
				request.id,
			);

			const task = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(request.id);
			return success({ task });
		}

		case "tasks:delete": {
			const existing = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(request.id);
			if (!existing) {
				return error(`Task not found: ${request.id}`);
			}
			db.query("DELETE FROM tasks WHERE id = ?").run(request.id);
			return success({ deleted: true });
		}

		case "tasks:move": {
			const existing = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(request.id);
			if (!existing) {
				return error(`Task not found: ${request.id}`);
			}

			const maxPos = db
				.query<{ max: number | null }, [number, string]>(
					"SELECT MAX(position) as max FROM tasks WHERE board_id = ? AND status = ?",
				)
				.get(existing.board_id, request.status);

			db.query(
				"UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now') WHERE id = ?",
			).run(request.status, (maxPos?.max ?? -1) + 1, request.id);

			const task = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(request.id);
			return success({ task });
		}

		default:
			return error(
				`Unknown request type: ${(request as { type: string }).type}`,
			);
	}
}
