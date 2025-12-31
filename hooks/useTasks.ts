import type { Priority, Tag, Task, TaskStatus, TaskWithTags } from "@types";
import { useCallback, useEffect, useState } from "react";
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
	const [isLoading, setIsLoading] = useState(true);

	const fetchTasks = useCallback(() => {
		const taskQuery = db.query<Task, [number]>(`
			SELECT * FROM tasks
			WHERE board_id = ? AND archived = 0
			ORDER BY status, position, created_at DESC
		`);
		const rawTasks = taskQuery.all(boardId);

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

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	const createTask = useCallback(
		(input: CreateTaskInput): Task => {
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
			fetchTasks();
			return task;
		},
		[db, fetchTasks],
	);

	const updateTask = useCallback(
		(id: number, input: UpdateTaskInput): Task | null => {
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
			fetchTasks();
			return task ?? null;
		},
		[db, fetchTasks],
	);

	const moveTask = useCallback(
		(id: number, newStatus: TaskStatus, newPosition?: number): Task | null => {
			const task = tasks.find((t) => t.id === id);
			if (!task) return null;

			const targetTasks = tasks.filter(
				(t) => t.status === newStatus && t.id !== id,
			);
			const pos = newPosition ?? targetTasks.length;

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
		(id: number): boolean => {
			db.query(`DELETE FROM tasks WHERE id = ?`).run(id);
			fetchTasks();
			return true;
		},
		[db, fetchTasks],
	);

	const archiveTask = useCallback(
		(id: number): boolean => {
			updateTask(id, { archived: true });
			return true;
		},
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

	const tasksByStatus = {
		todo: tasks.filter((t) => t.status === "todo"),
		doing: tasks.filter((t) => t.status === "doing"),
		done: tasks.filter((t) => t.status === "done"),
	};

	return {
		tasks,
		tasksByStatus,
		isLoading,
		createTask,
		updateTask,
		moveTask,
		deleteTask,
		archiveTask,
		getTask,
		refresh: fetchTasks,
	};
}
