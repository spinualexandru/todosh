#!/usr/bin/env bun
import { getDatabase } from "@lib/db/connection";
import type { Board, Task } from "@types";

const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
	console.log(`todosh - Terminal task manager

Usage:
  todosh                      Launch TUI
  todosh <command> [options]  Run CLI command

Commands:
  boards                      List all boards
  board:create <name>         Create a new board
  board:delete <id>           Delete a board

  list [options]              List tasks
    -b, --board <id>          Filter by board
    -s, --status <status>     Filter by status (todo|doing|done)

  add <title> [options]       Add a new task
    -b, --board <id>          Board ID (uses first board if not specified)
    -d, --description <text>  Task description
    -p, --priority <level>    Priority (low|medium|high|urgent)

  done <id>                   Mark task as done
  doing <id>                  Mark task as doing
  todo <id>                   Mark task as todo
  move <id> <status>          Move task to status
  delete <id>                 Delete a task

  help                        Show this help

Examples:
  todosh boards
  todosh board:create "Work"
  todosh add "Fix bug" -b 1 -p high
  todosh list -b 1 -s todo
  todosh done 5
`);
}

function parseArgs(args: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg?.startsWith("-")) {
			const key = arg.replace(/^-+/, "");
			const value = args[i + 1];
			if (value && !value.startsWith("-")) {
				result[key] = value;
				i++;
			} else {
				result[key] = "true";
			}
		}
	}
	return result;
}

function getPositionalArgs(args: string[]): string[] {
	return args.filter((arg) => !arg.startsWith("-"));
}

async function main(): Promise<void> {
	if (
		!command ||
		command === "help" ||
		command === "--help" ||
		command === "-h"
	) {
		printHelp();
		return;
	}

	const db = getDatabase();

	switch (command) {
		case "boards": {
			const boards = db
				.query<Board, []>(
					"SELECT * FROM boards WHERE archived = 0 ORDER BY name",
				)
				.all();
			if (boards.length === 0) {
				console.log(
					"No boards found. Create one with: todosh board:create <name>",
				);
				return;
			}
			console.log("Boards:");
			for (const board of boards) {
				const taskCount = db
					.query<{ count: number }, [number]>(
						"SELECT COUNT(*) as count FROM tasks WHERE board_id = ? AND archived = 0",
					)
					.get(board.id);
				console.log(
					`  [${board.id}] ${board.name} (${taskCount?.count ?? 0} tasks)`,
				);
			}
			break;
		}

		case "board:create": {
			const name = args[1];
			if (!name) {
				console.error("Error: Board name required");
				console.log("Usage: todosh board:create <name>");
				process.exit(1);
			}
			const result = db
				.query<{ id: number }, [string]>(
					"INSERT INTO boards (name) VALUES (?) RETURNING id",
				)
				.get(name);
			console.log(`Created board "${name}" with ID ${result?.id}`);
			break;
		}

		case "board:delete": {
			const id = Number.parseInt(args[1] ?? "", 10);
			if (Number.isNaN(id)) {
				console.error("Error: Valid board ID required");
				process.exit(1);
			}
			const board = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(id);
			if (!board) {
				console.error(`Error: Board not found: ${id}`);
				process.exit(1);
			}
			db.query("DELETE FROM boards WHERE id = ?").run(id);
			console.log(`Deleted board "${board.name}"`);
			break;
		}

		case "list": {
			const opts = parseArgs(args.slice(1));
			let query = "SELECT * FROM tasks WHERE archived = 0";
			const params: (number | string)[] = [];

			if (opts.b || opts.board) {
				const boardId = Number.parseInt(opts.b || opts.board, 10);
				if (!Number.isNaN(boardId)) {
					query += " AND board_id = ?";
					params.push(boardId);
				}
			}
			if (opts.s || opts.status) {
				const status = opts.s || opts.status;
				query += " AND status = ?";
				params.push(status);
			}
			query += " ORDER BY board_id, status, position";

			const tasks = db.query<Task, (number | string)[]>(query).all(...params);
			if (tasks.length === 0) {
				console.log("No tasks found.");
				return;
			}

			const statusIcon: Record<string, string> = {
				todo: "[ ]",
				doing: "[~]",
				done: "[x]",
			};

			console.log("Tasks:");
			for (const task of tasks) {
				const icon = statusIcon[task.status] ?? "[ ]";
				const priority =
					task.priority !== "medium" ? ` (${task.priority})` : "";
				console.log(`  ${icon} [${task.id}] ${task.title}${priority}`);
			}
			break;
		}

		case "add": {
			const positional = getPositionalArgs(args.slice(1));
			const title = positional[0];
			if (!title) {
				console.error("Error: Task title required");
				console.log("Usage: todosh add <title> [-b <board>] [-p <priority>]");
				process.exit(1);
			}

			const opts = parseArgs(args.slice(1));
			let boardId = Number.parseInt(opts.b || opts.board || "", 10);

			if (Number.isNaN(boardId)) {
				const firstBoard = db
					.query<Board, []>(
						"SELECT * FROM boards WHERE archived = 0 ORDER BY id LIMIT 1",
					)
					.get();
				if (!firstBoard) {
					console.error(
						"Error: No boards found. Create one with: todosh board:create <name>",
					);
					process.exit(1);
				}
				boardId = firstBoard.id;
			}

			const board = db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(boardId);
			if (!board) {
				console.error(`Error: Board not found: ${boardId}`);
				process.exit(1);
			}

			const priority = opts.p || opts.priority || "medium";
			const description = opts.d || opts.description || "";

			const maxPos = db
				.query<{ max: number | null }, [number]>(
					"SELECT MAX(position) as max FROM tasks WHERE board_id = ? AND status = 'todo'",
				)
				.get(boardId);

			const result = db
				.query<{ id: number }, [number, string, string, string, number]>(
					"INSERT INTO tasks (board_id, title, description, priority, position) VALUES (?, ?, ?, ?, ?) RETURNING id",
				)
				.get(boardId, title, description, priority, (maxPos?.max ?? -1) + 1);

			console.log(
				`Created task "${title}" (ID: ${result?.id}) in board "${board.name}"`,
			);
			break;
		}

		case "done":
		case "doing":
		case "todo": {
			const id = Number.parseInt(args[1] ?? "", 10);
			if (Number.isNaN(id)) {
				console.error("Error: Valid task ID required");
				process.exit(1);
			}
			const task = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(id);
			if (!task) {
				console.error(`Error: Task not found: ${id}`);
				process.exit(1);
			}
			db.query(
				"UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?",
			).run(command, id);
			console.log(`Marked task "${task.title}" as ${command}`);
			break;
		}

		case "move": {
			const id = Number.parseInt(args[1] ?? "", 10);
			const status = args[2];
			if (Number.isNaN(id)) {
				console.error("Error: Valid task ID required");
				process.exit(1);
			}
			if (!status || !["todo", "doing", "done"].includes(status)) {
				console.error("Error: Valid status required (todo|doing|done)");
				process.exit(1);
			}
			const task = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(id);
			if (!task) {
				console.error(`Error: Task not found: ${id}`);
				process.exit(1);
			}
			db.query(
				"UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?",
			).run(status, id);
			console.log(`Moved task "${task.title}" to ${status}`);
			break;
		}

		case "delete": {
			const id = Number.parseInt(args[1] ?? "", 10);
			if (Number.isNaN(id)) {
				console.error("Error: Valid task ID required");
				process.exit(1);
			}
			const task = db
				.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
				.get(id);
			if (!task) {
				console.error(`Error: Task not found: ${id}`);
				process.exit(1);
			}
			db.query("DELETE FROM tasks WHERE id = ?").run(id);
			console.log(`Deleted task "${task.title}"`);
			break;
		}

		default:
			console.error(`Unknown command: ${command}`);
			console.log("Run 'todosh help' for usage information.");
			process.exit(1);
	}
}

main().catch((err) => {
	console.error("Error:", err.message);
	process.exit(1);
});
