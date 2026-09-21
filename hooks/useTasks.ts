import {
	createLinearTask,
	deleteLinearTask,
	linkedBoard,
	updateLinearTask,
} from "@lib/linear";
import { cachedTasks } from "@lib/linear/project-filter";
import { getBoardWorkflow } from "@lib/workflows/board-sync";
import type { Priority, Tag, Task, TaskStatus, TaskWithTags } from "@types";
import { useSelector } from "@xstate/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDatabase } from "./useDatabase";

interface CreateTaskInput {
	board_id: number;
	title: string;
	description?: string;
	status?: TaskStatus;
	priority?: Priority;
	due_date?: string;
}

interface UpdateTaskInput {
	title?: string;
	description?: string;
	status?: TaskStatus;
	priority?: Priority;
	due_date?: string | null;
	position?: number;
	archived?: boolean;
}

export function useTasks(boardId: number) {
	const db = useDatabase();
	const [tasks, setTasks] = useState<TaskWithTags[]>([]);
	const workflow = useMemo(() => getBoardWorkflow(db, boardId), [db, boardId]);
	const error = useSelector(workflow.actor, (state) => state.context.error);
	const isSyncing = useSelector(workflow.actor, (state) =>
		state.matches("working"),
	);
	const perform = workflow.run;
	const [isLoading, setIsLoading] = useState(true);

	const fetchTasks = useCallback(() => {
		const rawTasks = cachedTasks(db, boardId);

		const tasksWithTags: TaskWithTags[] = rawTasks.map((task) => {
			const tagQuery = db.query<Tag, [number]>(`
				SELECT t.* FROM tags t
				INNER JOIN task_tags tt ON tt.tag_id = t.id
				WHERE tt.task_id = ?
			`);
			const tags = tagQuery.all(task.id);
			return { ...task, tags };
		});

		setTasks(tasksWithTags);
		setIsLoading(false);
	}, [db, boardId]);

	const refresh = useCallback(
		() => workflow.actor.send({ type: "REFRESH" }),
		[workflow],
	);
	useEffect(() => {
		let revision = workflow.actor.getSnapshot().context.revision;
		const subscription = workflow.actor.subscribe((state) => {
			if (state.context.revision !== revision) {
				revision = state.context.revision;
				fetchTasks();
			}
		});
		fetchTasks();
		workflow.actor.send({ type: "WATCH" });
		return () => {
			subscription.unsubscribe();
			workflow.actor.send({ type: "UNWATCH" });
		};
	}, [workflow, fetchTasks]);

	const createTask = useCallback(
		(input: CreateTaskInput) =>
			perform(async (signal) => {
				const board = linkedBoard(db, input.board_id);
				if (board) {
					const task = await createLinearTask(
						db,
						board,
						input,
						undefined,
						signal,
					);
					return task;
				}
				const maxPosQuery = db.query<
					{ maxPos: number | null },
					[number, string]
				>(`
				SELECT MAX(position) as maxPos FROM tasks
				WHERE board_id = ? AND status = ?
			`);
				const result = maxPosQuery.get(input.board_id, input.status ?? "todo");
				const position = (result?.maxPos ?? -1) + 1;

				const stmt = db.query<
					Task,
					[number, string, string, string, string, string | null, number]
				>(`
				INSERT INTO tasks (board_id, title, description, status, priority, due_date, position)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				RETURNING *
			`);
				const task = stmt.get(
					input.board_id,
					input.title,
					input.description ?? "",
					input.status ?? "todo",
					input.priority ?? "medium",
					input.due_date ?? null,
					position,
				);
				if (!task) throw new Error("Failed to create task");
				return task;
			}),
		[db, perform],
	);

	const updateTask = useCallback(
		(id: number, input: UpdateTaskInput) =>
			perform(async (signal) => {
				const existing = db
					.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
					.get(id);
				if (existing && linkedBoard(db, existing.board_id))
					await updateLinearTask(db, existing, input, undefined, signal);
				signal.throwIfAborted();
				const updates: string[] = [];
				const values: (string | number | null)[] = [];

				if (input.title !== undefined) {
					updates.push("title = ?");
					values.push(input.title);
				}
				if (input.description !== undefined) {
					updates.push("description = ?");
					values.push(input.description);
				}
				if (input.status !== undefined) {
					updates.push("status = ?");
					values.push(input.status);
				}
				if (input.priority !== undefined) {
					updates.push("priority = ?");
					values.push(input.priority);
				}
				if (input.due_date !== undefined) {
					updates.push("due_date = ?");
					values.push(input.due_date);
				}
				if (input.position !== undefined) {
					updates.push("position = ?");
					values.push(input.position);
				}
				if (input.archived !== undefined) {
					updates.push("archived = ?");
					values.push(input.archived ? 1 : 0);
				}

				if (updates.length === 0) return null;

				updates.push("updated_at = datetime('now')");
				values.push(id);

				const stmt = db.query<Task, (string | number | null)[]>(`
				UPDATE tasks
				SET ${updates.join(", ")}
				WHERE id = ?
				RETURNING *
			`);
				const task = stmt.get(...values);
				return task ?? null;
			}),
		[db, perform],
	);

	const moveTask = useCallback(
		(id: number, newStatus: TaskStatus, newPosition?: number) => {
			const task = tasks.find((t) => t.id === id);
			if (!task) return null;

			const targetTasks = tasks.filter(
				(t) => t.status === newStatus && t.id !== id,
			);
			const pos = newPosition ?? targetTasks.length;

			if (linkedBoard(db, task.board_id))
				return updateTask(id, { status: newStatus });
			targetTasks.forEach((t, i) => {
				if (i >= pos) {
					db.query(`UPDATE tasks SET position = ? WHERE id = ?`).run(
						i + 1,
						t.id,
					);
				}
			});

			return updateTask(id, { status: newStatus, position: pos });
		},
		[db, tasks, updateTask],
	);

	const deleteTask = useCallback(
		(id: number) =>
			perform(async (signal) => {
				const existing = db
					.query<Task, [number]>("SELECT * FROM tasks WHERE id = ?")
					.get(id);
				if (existing && linkedBoard(db, existing.board_id))
					await deleteLinearTask(db, existing, undefined, signal);
				signal.throwIfAborted();
				db.query(`DELETE FROM tasks WHERE id = ?`).run(id);
				return true;
			}),
		[db, perform],
	);

	const archiveTask = useCallback(
		(id: number) => updateTask(id, { archived: true }),
		[updateTask],
	);

	const getTask = useCallback(
		(id: number): TaskWithTags | null => {
			const taskQuery = db.query<Task, [number]>(`
				SELECT * FROM tasks WHERE id = ? AND archived = 0
			`);
			const task = taskQuery.get(id);
			if (!task) return null;

			const tagQuery = db.query<Tag, [number]>(`
				SELECT t.* FROM tags t
				INNER JOIN task_tags tt ON tt.tag_id = t.id
				WHERE tt.task_id = ?
			`);
			const tags = tagQuery.all(task.id);
			return { ...task, tags };
		},
		[db],
	);

	const setTaskTags = useCallback(
		(taskId: number, tagNames: string[]): void => {
			// Remove all existing tags
			db.query(`DELETE FROM task_tags WHERE task_id = ?`).run(taskId);

			// Add new tags
			for (const name of tagNames) {
				const trimmed = name.trim();
				if (!trimmed) continue;

				// Find or create tag
				let tag = db
					.query<Tag, [string]>(`SELECT * FROM tags WHERE name = ?`)
					.get(trimmed);
				if (!tag) {
					tag = db
						.query<Tag, [string, string]>(
							`INSERT INTO tags (name, color) VALUES (?, ?) RETURNING *`,
						)
						.get(trimmed, "gray");
				}
				if (tag) {
					db.query(
						`INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)`,
					).run(taskId, tag.id);
				}
			}
			fetchTasks();
		},
		[db, fetchTasks],
	);

	const tasksByStatus = {
		todo: tasks.filter((t) => t.status === "todo"),
		doing: tasks.filter((t) => t.status === "doing"),
		done: tasks.filter((t) => t.status === "done"),
	};

	return {
		tasks,
		tasksByStatus,
		isLoading,
		error,
		isSyncing,
		createTask,
		updateTask,
		moveTask,
		deleteTask,
		archiveTask,
		getTask,
		setTaskTags,
		refresh,
	};
}
