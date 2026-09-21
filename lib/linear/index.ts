import type { Database } from "bun:sqlite";

import { type Issue, LinearClient } from "@linear/sdk";
import type { Board, Priority, Task, TaskStatus } from "@types";

import { linearCredentials } from "./credentials";

function required<T>(value: T | null | undefined, name: string): T {
	if (value == null) throw new Error(`Linear: missing ${name}.`);
	return value;
}

export async function linearClient(
	signal?: AbortSignal,
): Promise<LinearClient> {
	const apiKey = await linearCredentials.get();
	if (!apiKey)
		throw new Error(
			"Linear: no API key configured. Set LINEAR_API_KEY or open the dashboard, press n, and choose Connect to Linear to save one securely.",
		);
	return new LinearClient({
		apiKey,
		signal: signal
			? AbortSignal.any([signal, AbortSignal.timeout(30000)])
			: AbortSignal.timeout(30000),
	});
}

// Do not expose SDK request details (which may contain authentication headers).
export function linearError(error: unknown): string {
	if (error instanceof Error && error.message.startsWith("Linear:"))
		return error.message;
	return "Linear request failed. Check your connection, API key, and team permissions, then retry.";
}

export async function allPages<T>(connection: {
	nodes: T[];
	pageInfo: { hasNextPage: boolean };
	fetchNext(): Promise<unknown>;
}): Promise<T[]> {
	while (connection.pageInfo.hasNextPage) await connection.fetchNext();
	return connection.nodes;
}

export function statusFromLinear(type: string): TaskStatus {
	if (type === "started") return "doing";
	if (type === "completed" || type === "canceled") return "done";
	return "todo";
}
export function priorityFromLinear(priority: number): Priority {
	return (
		({ 1: "urgent", 2: "high", 3: "medium", 4: "low" } as const)[priority] ??
		"medium"
	);
}
const priorities = { urgent: 1, high: 2, medium: 3, low: 4 };
export function linkedBoard(db: Database, id: number): Board | null {
	return db
		.query<Board, [number]>(
			"SELECT * FROM boards WHERE id = ? AND source = 'linear'",
		)
		.get(id);
}

async function checkedClient(board: Board, injectedClient?: LinearClient) {
	const client = injectedClient ?? (await linearClient());
	if ((await client.organization).id !== board.linear_org_id)
		throw new Error("Linear: this API key belongs to a different workspace.");
	return client;
}

export async function listTeams(signal?: AbortSignal) {
	const client = await linearClient(signal);
	return allPages(await client.teams());
}
export async function listProjects(teamId: string, signal?: AbortSignal) {
	return allPages(
		await (await (await linearClient(signal)).team(teamId)).projects(),
	);
}

async function snapshot(
	board: Pick<Board, "linear_team_id" | "linear_project_id">,
	client: LinearClient,
) {
	const issues = await allPages(
		await client.issues({
			filter: {
				team: { id: { eq: required(board.linear_team_id, "team ID") } },
			},
			first: 100,
		}),
	);
	// Bound lazy state requests to avoid flooding the API on large teams.
	const rows: {
		issue: Issue;
		state: string;
		project?: { id: string; name: string };
	}[] = [];
	for (let offset = 0; offset < issues.length; offset += 10) {
		rows.push(
			...(await Promise.all(
				issues.slice(offset, offset + 10).map(async (issue) => ({
					issue,
					state: (await issue.state)?.type ?? "unstarted",
					project: await issue.project,
				})),
			)),
		);
	}
	const projects = await allPages(
		await (
			await client.team(required(board.linear_team_id, "team ID"))
		).projects(),
	);
	return { rows, projects };
}
function cacheIssue(
	db: Database,
	boardId: number,
	issue: Issue,
	state: string,
	projectId: string | null,
): Task {
	const task = db
		.query<Task, (string | number | null)[]>(`INSERT INTO tasks
 (board_id, linear_issue_id, linear_identifier, linear_url, title, description, status, priority, due_date, position, created_at, updated_at, archived, linear_project_id)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
 ON CONFLICT(board_id, linear_issue_id) DO UPDATE SET
 linear_identifier=excluded.linear_identifier, linear_url=excluded.linear_url, title=excluded.title,
 description=excluded.description, status=excluded.status, priority=excluded.priority,
 due_date=excluded.due_date, position=excluded.position, updated_at=excluded.updated_at, archived=0, linear_project_id=excluded.linear_project_id
 RETURNING *`)
		.get(
			boardId,
			issue.id,
			issue.identifier,
			issue.url,
			issue.title,
			issue.description ?? "",
			statusFromLinear(state),
			priorityFromLinear(issue.priority),
			issue.dueDate ?? null,
			issue.sortOrder,
			issue.createdAt.toISOString(),
			issue.updatedAt.toISOString(),
			projectId,
		);
	return required(task, "cached issue");
}
function applySnapshot(
	db: Database,
	board: Board,
	data: Awaited<ReturnType<typeof snapshot>>,
) {
	db.transaction(() => {
		// Keep IDs and local annotations stable; missing/archived remote issues leave the active view.
		db.query(
			"UPDATE tasks SET archived = 1 WHERE board_id = ? AND linear_issue_id IS NOT NULL",
		).run(board.id);
		db.query("DELETE FROM board_projects WHERE board_id=?").run(board.id);
		const cacheProject = db.query(
			"INSERT OR REPLACE INTO board_projects(board_id,id,name) VALUES(?,?,?)",
		);
		for (const project of data.projects)
			cacheProject.run(board.id, project.id, project.name);
		for (const { issue, state, project } of data.rows) {
			cacheIssue(db, board.id, issue, state, project?.id ?? null);
			if (project) cacheProject.run(board.id, project.id, project.name);
		}
		db.query(
			`UPDATE boards SET project_filter_name=COALESCE((SELECT name FROM board_projects WHERE board_id=boards.id AND id=boards.project_filter_id),project_filter_name) WHERE id=?`,
		).run(board.id);
	})();
}
export async function connectBoard(
	db: Database,
	teamId: string,
	projectId?: string,
	injectedClient?: LinearClient,
	signal?: AbortSignal,
): Promise<Board> {
	const client = injectedClient ?? (await linearClient(signal));
	const org = await client.organization;
	const team = await client.team(teamId);
	const project = projectId
		? (await allPages(await team.projects())).find((p) => p.id === projectId)
		: undefined;
	if (projectId && !project)
		throw new Error("Linear: project does not belong to this team.");
	const existing = db
		.query<Board, [string, string, string | null]>(
			"SELECT * FROM boards WHERE source='linear' AND linear_org_id=? AND linear_team_id=? AND linear_project_id IS ? AND archived=0",
		)
		.get(org.id, team.id, projectId ?? null);
	if (existing) {
		await syncBoard(db, existing.id, client, signal);
		return required(linkedBoard(db, existing.id), "board");
	}
	const input = {
		linear_team_id: team.id,
		linear_project_id: projectId ?? null,
	};
	const rows = await snapshot(input, client);
	signal?.throwIfAborted();
	return db.transaction(() => {
		const board = db
			.query<Board, [string, string, string, string | null, string | null]>(
				"INSERT INTO boards(name, source, linear_org_id, linear_team_id, linear_project_id, project) VALUES (?, 'linear', ?, ?, ?, ?) RETURNING *",
			)
			.get(
				project ? `${team.name} / ${project.name}` : team.name,
				org.id,
				team.id,
				projectId ?? null,
				project?.name ?? null,
			);
		if (!board) throw new Error("Linear: failed to save board.");
		db.query(
			"UPDATE boards SET project_filter_id=?,project_filter_name=? WHERE id=?",
		).run(projectId ?? null, project?.name ?? null, board.id);
		applySnapshot(db, board, rows);
		return required(linkedBoard(db, board.id), "board");
	})();
}
export async function syncBoard(
	db: Database,
	boardId: number,
	client?: LinearClient,
	signal?: AbortSignal,
) {
	const board = linkedBoard(db, boardId);
	if (!board) return;
	const checked = await checkedClient(
		board,
		client ?? (await linearClient(signal)),
	);
	const project = board.linear_project_id
		? await checked.project(board.linear_project_id)
		: null;
	const rows = await snapshot(board, checked);
	signal?.throwIfAborted();
	// A board can be disconnected while the network request is in progress.
	if (linkedBoard(db, boardId)) {
		db.transaction(() => {
			applySnapshot(db, board, rows);
			db.query("UPDATE boards SET project = ? WHERE id = ?").run(
				project?.name ?? null,
				boardId,
			);
		})();
	}
}
async function stateId(client: LinearClient, board: Board, status: TaskStatus) {
	const states = await allPages(
		await (
			await client.team(required(board.linear_team_id, "team ID"))
		).states(),
	);
	const type = { todo: "unstarted", doing: "started", done: "completed" }[
		status
	];
	const state =
		states
			.filter((s) => s.type === type)
			.sort((a, b) => a.position - b.position)[0] ??
		(status === "todo" ? states.find((s) => s.type === "backlog") : undefined);
	if (!state)
		throw new Error(`Linear: team has no workflow state for ${status}.`);
	return state.id;
}
export interface LinearTaskInput {
	title?: string;
	description?: string;
	status?: TaskStatus;
	priority?: Priority;
	due_date?: string | null;
	position?: number;
	archived?: boolean;
}
export async function createLinearTask(
	db: Database,
	board: Board,
	input: LinearTaskInput & { title: string },
	injectedClient?: LinearClient,
	signal?: AbortSignal,
) {
	const client = await checkedClient(
		board,
		injectedClient ?? (await linearClient(signal)),
	);
	const result = await client.createIssue({
		teamId: required(board.linear_team_id, "team ID"),
		projectId: board.project_filter_id ?? undefined,
		title: input.title,
		description: input.description,
		stateId: await stateId(client, board, input.status ?? "todo"),
		priority: priorities[input.priority ?? "medium"],
		dueDate: input.due_date,
	});
	const issue = await result.issue;
	if (!result.success || !issue)
		throw new Error("Linear: issue creation failed.");
	const state = (await issue.state)?.type ?? "unstarted";
	const project = await issue.project;
	signal?.throwIfAborted();
	return cacheIssue(db, board.id, issue, state, project?.id ?? null);
}
export async function updateLinearTask(
	db: Database,
	task: Task,
	input: LinearTaskInput,
	injectedClient?: LinearClient,
	signal?: AbortSignal,
) {
	const board = required(linkedBoard(db, task.board_id), "board");
	const client = await checkedClient(
		board,
		injectedClient ?? (await linearClient(signal)),
	);
	if (!task.linear_issue_id)
		throw new Error("Linear: task has no linked issue.");
	const changes: Parameters<LinearClient["updateIssue"]>[1] = {};
	if (input.title !== undefined) changes.title = input.title;
	if (input.description !== undefined) changes.description = input.description;
	if (input.status !== undefined && input.status !== task.status)
		changes.stateId = await stateId(client, board, input.status);
	if (input.priority !== undefined)
		changes.priority = priorities[input.priority];
	if (input.due_date !== undefined) changes.dueDate = input.due_date;
	if (
		Object.keys(changes).length &&
		!(await client.updateIssue(task.linear_issue_id, changes)).success
	)
		throw new Error("Linear: issue update failed.");
	if (
		input.archived &&
		!(await client.archiveIssue(task.linear_issue_id)).success
	)
		throw new Error("Linear: archive failed.");
}
export async function deleteLinearTask(
	db: Database,
	task: Task,
	injectedClient?: LinearClient,
	signal?: AbortSignal,
) {
	const client = await checkedClient(
		required(linkedBoard(db, task.board_id), "board"),
		injectedClient ?? (await linearClient(signal)),
	);
	if (
		!task.linear_issue_id ||
		!(await client.deleteIssue(task.linear_issue_id)).success
	)
		throw new Error("Linear: delete failed.");
}
