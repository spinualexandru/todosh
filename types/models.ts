export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Board {
	id: number;
	name: string;
	description: string;
	created_at: string;
	updated_at: string;
	archived: boolean;
}

export interface Task {
	id: number;
	board_id: number;
	title: string;
	description: string;
	status: TaskStatus;
	priority: Priority;
	due_date: string | null;
	position: number;
	created_at: string;
	updated_at: string;
	archived: boolean;
}

export interface Tag {
	id: number;
	name: string;
	color: string;
}

export interface TaskTag {
	task_id: number;
	tag_id: number;
}

export interface Comment {
	id: number;
	task_id: number;
	content: string;
	created_at: string;
}

export interface TaskWithTags extends Task {
	tags: Tag[];
}

export interface BoardWithStats extends Board {
	taskCount: number;
	todoCount: number;
	doingCount: number;
	doneCount: number;
}
