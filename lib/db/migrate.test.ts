import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";

import {
	cachedProjects,
	cachedTasks,
	setProjectFilter,
} from "@lib/linear/project-filter";

import { migrate } from "./migrate";
import { SCHEMA } from "./schema";

test("legacy project connections retain cached tasks and migration preserves a later All projects selection", () => {
	const db = new Database(":memory:");
	try {
		db.exec(SCHEMA);
		db.exec(`ALTER TABLE boards ADD COLUMN source TEXT DEFAULT 'local';
   ALTER TABLE boards ADD COLUMN project TEXT;
   ALTER TABLE boards ADD COLUMN linear_project_id TEXT;
   ALTER TABLE tasks ADD COLUMN linear_issue_id TEXT;
   INSERT INTO boards(id,name,source,project,linear_project_id) VALUES(1,'Engineering','linear','Launch','project-1');
   INSERT INTO tasks(board_id,title,linear_issue_id) VALUES(1,'Cached issue','issue-1');`);
		migrate(db);
		expect(cachedProjects(db, 1)).toEqual([
			{ id: "project-1", name: "Launch" },
		]);
		expect(cachedTasks(db, 1).map((t) => t.linear_project_id)).toEqual([
			"project-1",
		]);
		expect(
			db.query("SELECT project_filter_id FROM boards WHERE id=1").get(),
		).toEqual({ project_filter_id: "project-1" });
		setProjectFilter(db, 1, null);
		migrate(db);
		expect(
			db.query("SELECT project_filter_id FROM boards WHERE id=1").get(),
		).toEqual({ project_filter_id: null });
		expect(cachedTasks(db, 1)).toHaveLength(1);
	} finally {
		db.close();
	}
});
