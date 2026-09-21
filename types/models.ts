export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Board {
	project_filter_id: string | null;
	project_filter_name: string | null;
	/** Cached name of the linked Linear project; null for local or team-wide boards. */
	project: string | null;
	source: "local" | "linear";
	linear_team_id: string | null;
	linear_project_id: string | null;
	linear_org_id: string | null;
	id: number;
	name: string;
	description: string;
	created_at: string;
	updated_at: string;
	archived: boolean;
}

export interface Task {
	linear_project_id: string | null;
	linear_issue_id: string | null;
	linear_identifier: string | null;
	linear_url: string | null;
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
