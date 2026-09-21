import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { migrate } from "@lib/db/migrate";
import { SCHEMA } from "@lib/db/schema";
import type { LinearClient } from "@linear/sdk";
import type { Board, Task } from "@types";

import {
	allPages,
	connectBoard,
	createLinearTask,
	deleteLinearTask,
	linearError,
	priorityFromLinear,
	statusFromLinear,
	syncBoard,
	updateLinearTask,
} from "./index";
import {
	cachedProjects,
	cachedTasks,
	setProjectFilter,
} from "./project-filter";

const page = <T>(nodes: T[]) => ({
	nodes,
	pageInfo: { hasNextPage: false },
	fetchNext: async () => {},
});
const issue = (
	id = "issue-1",
	title = "Remote issue",
	type = "started",
	projectId: string | null = "project-1",
) => ({
	id,
	identifier: "ENG-1",
	url: "https://linear.app/test/issue/ENG-1",
	title,
	description: "Details",
	priority: 2,
	dueDate: "2026-10-01",
	sortOrder: 1.5,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-09-01"),
	state: Promise.resolve({ type }),
	project: projectId
		? Promise.resolve({ id: projectId, name: "Launch" })
		: undefined,
});
function fakeClient() {
	const remote = {
		organization: Promise.resolve({ id: "org-1" }),
		project: mock(async (_id: string) => ({ id: "project-1", name: "Launch" })),
		team: mock(async () => ({
			id: "team-1",
			name: "Engineering",
			projects: async () => page([{ id: "project-1", name: "Launch" }]),
			states: async () =>
				page([
					{ id: "todo", type: "unstarted", position: 0 },
					{ id: "doing", type: "started", position: 1 },
					{ id: "done", type: "completed", position: 2 },
				]),
		})),
		issues: mock(async (_options?: unknown) => page([issue()])),
		createIssue: mock(async (_input?: unknown) => ({
			success: true,
			issue: Promise.resolve(issue("new-issue")),
		})),
		updateIssue: mock(async (_id?: string, _input?: unknown) => ({
			success: true,
		})),
		archiveIssue: mock(async (_id?: string) => ({ success: true })),
		deleteIssue: mock(async (_id?: string) => ({ success: true })),
	};
	return { remote, client: remote as unknown as LinearClient };
}
let db: Database;
beforeEach(() => {
	db = new Database(":memory:");
	db.exec("PRAGMA foreign_keys=ON");
	db.exec(SCHEMA);
	migrate(db);
});
afterEach(() => db.close());
const task = () =>
	db.query<Task, []>("SELECT * FROM tasks ORDER BY id").get() as Task;

describe("Linear boards", () => {
	test("local project filtering makes no requests and preserves every cached task and note", async () => {
		const { remote, client } = fakeClient();
		remote.issues.mockResolvedValue(
			page([issue(), issue("unassigned", "Unassigned", "unstarted", null)]),
		);
		const board = await connectBoard(db, "team-1", undefined, client);
		const original = task();
		db.query(
			"INSERT INTO comments(task_id,content) VALUES(?, 'Local note')",
		).run(original.id);
		const calls = remote.issues.mock.calls.length;
		const teams = remote.team.mock.calls.length;
		const filtered = setProjectFilter(db, board.id, "project-1");
		expect(filtered).toMatchObject({
			name: board.name,
			linear_project_id: null,
			project_filter_id: "project-1",
			project_filter_name: "Launch",
		});
		expect(cachedTasks(db, board.id).map((t) => t.linear_issue_id)).toEqual([
			"issue-1",
		]);
		expect(db.query("SELECT * FROM tasks WHERE archived=0").all()).toHaveLength(
			2,
		);
		remote.issues.mockRejectedValue(new Error("Offline"));
		setProjectFilter(db, board.id, null);
		expect(cachedTasks(db, board.id)).toHaveLength(2);
		expect(task().id).toBe(original.id);
		expect(db.query("SELECT * FROM comments").all()).toHaveLength(1);
		expect(remote.issues).toHaveBeenCalledTimes(calls);
		expect(remote.team).toHaveBeenCalledTimes(teams);
	});
	test("filter is independent of the connected project and survives refresh", async () => {
		const { remote, client } = fakeClient();
		remote.issues.mockResolvedValue(
			page([issue(), issue("unassigned", "Unassigned", "unstarted", null)]),
		);
		const board = await connectBoard(db, "team-1", "project-1", client);
		expect(cachedTasks(db, board.id)).toHaveLength(1);
		setProjectFilter(db, board.id, null);
		await syncBoard(db, board.id, client);
		expect(cachedTasks(db, board.id)).toHaveLength(2);
		expect(
			db
				.query<Board, [number]>("SELECT * FROM boards WHERE id=?")
				.get(board.id),
		).toMatchObject({
			linear_project_id: "project-1",
			project_filter_id: null,
		});
		expect(cachedProjects(db, board.id)).toEqual([
			{ id: "project-1", name: "Launch" },
		]);
	});
	test("local filters allow projects that also have their own connected board", async () => {
		const { client } = fakeClient();
		const board = await connectBoard(db, "team-1", undefined, client);
		await connectBoard(db, "team-1", "project-1", client);
		expect(setProjectFilter(db, board.id, "project-1").project_filter_id).toBe(
			"project-1",
		);
		expect(() => setProjectFilter(db, board.id, "unknown")).toThrow(
			"not cached",
		);
		expect(
			db.query<Board, [number]>("SELECT * FROM boards WHERE id=?").get(board.id)
				?.project_filter_id,
		).toBe("project-1");
	});
	test("filter switching is independent of an in-flight refresh", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", "project-1", client);
		remote.issues.mockImplementation(async () => {
			setProjectFilter(db, board.id, null);
			return page([issue(), issue("other", "Other", "unstarted", null)]);
		});
		await syncBoard(db, board.id, client);
		expect(cachedTasks(db, board.id)).toHaveLength(2);
		expect(
			db.query<Board, [number]>("SELECT * FROM boards WHERE id=?").get(board.id)
				?.project_filter_id,
		).toBeNull();
	});
	test("canceled imports do not persist a board", async () => {
		const { remote, client } = fakeClient();
		const controller = new AbortController();
		remote.issues.mockImplementation(async () => {
			controller.abort();
			return page([issue()]);
		});
		await expect(
			connectBoard(db, "team-1", undefined, client, controller.signal),
		).rejects.toThrow();
		expect(db.query("SELECT * FROM boards").all()).toHaveLength(0);
	});

	test("refresh backfills project names and tracks renames without changing the board title", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", "project-1", client);
		db.query(
			"UPDATE boards SET name = 'My board', project = NULL WHERE id = ?",
		).run(board.id);
		await syncBoard(db, board.id, client);
		expect(
			db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(board.id)?.project,
		).toBe("Launch");
		remote.project.mockResolvedValue({
			id: "project-1",
			name: "New project name",
		});
		const reconnected = await connectBoard(db, "team-1", "project-1", client);
		expect(reconnected).toMatchObject({
			id: board.id,
			name: "My board",
			project: "New project name",
			linear_project_id: "project-1",
		});
	});
	test("failed project refresh preserves the cached project and tasks", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", "project-1", client);
		remote.project.mockRejectedValue(new Error("Offline"));
		await expect(syncBoard(db, board.id, client)).rejects.toThrow("Offline");
		expect(
			db
				.query<Board, [number]>("SELECT * FROM boards WHERE id = ?")
				.get(board.id)?.project,
		).toBe("Launch");
		expect(Boolean(task().archived)).toBe(false);
	});

	test("migration preserves old local boards and tasks and is repeatable", () => {
		const old = new Database(":memory:");
		old.exec(SCHEMA);
		old.exec(
			"INSERT INTO boards(name) VALUES ('Local'); INSERT INTO tasks(board_id,title) VALUES(1,'Keep me')",
		);
		migrate(old);
		migrate(old);
		expect(old.query<Board, []>("SELECT * FROM boards").get()?.source).toBe(
			"local",
		);
		expect(old.query<Task, []>("SELECT * FROM tasks").get()?.title).toBe(
			"Keep me",
		);
		old.close();
	});
	test("connect imports fields and reconnection preserves IDs and comments", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", undefined, client);
		const original = task();
		expect(board.project).toBeNull();
		expect(original).toMatchObject({
			title: "Remote issue",
			status: "doing",
			priority: "high",
			due_date: "2026-10-01",
			linear_issue_id: "issue-1",
		});
		db.query(
			"INSERT INTO comments(task_id,content) VALUES(?, 'Keep note')",
		).run(original.id);
		remote.issues.mockImplementation(async () =>
			page([issue("issue-1", "Updated", "completed")]),
		);
		expect((await connectBoard(db, "team-1", undefined, client)).id).toBe(
			board.id,
		);
		expect(task()).toMatchObject({
			id: original.id,
			title: "Updated",
			status: "done",
		});
		expect(db.query("SELECT * FROM comments").all()).toHaveLength(1);
		expect(db.query("SELECT * FROM boards").all()).toHaveLength(1);
	});
	test("project connection caches the full team and initially filters locally", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", "project-1", client);
		expect(board.name).toBe("Engineering / Launch");
		expect(board.project).toBe("Launch");
		expect(board.project_filter_id).toBe("project-1");
		expect(remote.issues.mock.calls[0]?.[0]).not.toHaveProperty(
			"filter.project",
		);
		expect(remote.issues.mock.calls[0]?.[0]).toMatchObject({
			filter: {
				team: { id: { eq: "team-1" } },
			},
		});
		await expect(
			connectBoard(db, "team-1", "wrong-project", client),
		).rejects.toThrow("does not belong");
	});
	test("failed import does not leave a partial board", async () => {
		const { remote, client } = fakeClient();
		remote.issues.mockRejectedValue(new Error("Offline"));
		await expect(
			connectBoard(db, "team-1", undefined, client),
		).rejects.toThrow();
		expect(db.query("SELECT * FROM boards").all()).toHaveLength(0);
	});
	test("failed refresh retains cached tasks; missing issues become inactive", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", undefined, client);
		remote.issues.mockRejectedValue(new Error("Offline"));
		await expect(syncBoard(db, board.id, client)).rejects.toThrow();
		expect(Boolean(task().archived)).toBe(false);
		remote.issues.mockImplementation(async () => page([]));
		await syncBoard(db, board.id, client);
		expect(Boolean(task().archived)).toBe(true);
	});
	test("wrong workspace cannot overwrite a cache", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", undefined, client);
		remote.organization = Promise.resolve({ id: "other-org" });
		await expect(syncBoard(db, board.id, client)).rejects.toThrow(
			"different workspace",
		);
		expect(Boolean(task().archived)).toBe(false);
	});
	test("create and update use remote IDs and workflow states", async () => {
		const { remote, client } = fakeClient();
		const board = await connectBoard(db, "team-1", "project-1", client);
		await createLinearTask(
			db,
			board,
			{ title: "New", status: "done", priority: "urgent" },
			client,
		);
		expect(remote.createIssue.mock.calls[0]?.[0]).toMatchObject({
			teamId: "team-1",
			projectId: "project-1",
			title: "New",
			stateId: "done",
			priority: 1,
		});
		await updateLinearTask(
			db,
			task(),
			{ status: "todo", due_date: null },
			client,
		);
		expect(remote.updateIssue.mock.calls[0]).toEqual([
			"issue-1",
			{ stateId: "todo", dueDate: null },
		]);
		await updateLinearTask(db, task(), { archived: true }, client);
		expect(remote.archiveIssue.mock.calls[0]).toEqual(["issue-1"]);
		await deleteLinearTask(db, task(), client);
		expect(remote.deleteIssue.mock.calls[0]).toEqual(["issue-1"]);
	});
	test("failed mutation does not update cache", async () => {
		const { remote, client } = fakeClient();
		await connectBoard(db, "team-1", undefined, client);
		remote.updateIssue.mockResolvedValue({ success: false });
		await expect(
			updateLinearTask(db, task(), { title: "Failed" }, client),
		).rejects.toThrow("update failed");
		expect(task().title).toBe("Remote issue");
	});
	test("metadata-only edits leave canceled workflow state unchanged", async () => {
		const { remote, client } = fakeClient();
		remote.issues.mockImplementation(async () =>
			page([issue("issue-1", "Canceled", "canceled")]),
		);
		await connectBoard(db, "team-1", undefined, client);
		await updateLinearTask(
			db,
			task(),
			{ status: "done", title: "Rename" },
			client,
		);
		expect(remote.updateIssue.mock.calls[0]?.[1]).toEqual({ title: "Rename" });
	});
	test("pagination includes every page and propagates page failures", async () => {
		const connection = {
			nodes: [1],
			pageInfo: { hasNextPage: true },
			fetchNext: async () => {
				connection.nodes.push(2);
				connection.pageInfo.hasNextPage = false;
			},
		};
		expect(await allPages(connection)).toEqual([1, 2]);
		await expect(
			allPages({
				nodes: [1],
				pageInfo: { hasNextPage: true },
				fetchNext: async () => {
					throw new Error("Page failed");
				},
			}),
		).rejects.toThrow("Page failed");
	});
	test("maps workflow and priority values and redacts request errors", () => {
		expect(
			[
				"triage",
				"backlog",
				"unstarted",
				"started",
				"completed",
				"canceled",
			].map(statusFromLinear),
		).toEqual(["todo", "todo", "todo", "doing", "done", "done"]);
		expect([0, 1, 2, 3, 4].map(priorityFromLinear)).toEqual([
			"medium",
			"urgent",
			"high",
			"medium",
			"low",
		]);
		expect(linearError(new Error("Authorization: secret"))).not.toContain(
			"secret",
		);
	});
});
