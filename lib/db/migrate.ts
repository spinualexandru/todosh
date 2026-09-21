import type { Database } from "bun:sqlite";

/** Additive, repeatable migration for databases created before Linear support. */
export function migrate(db: Database): void {
	db.transaction(() => {
		const hadProjectFilter = db
			.query<{ name: string }, []>("PRAGMA table_info(boards)")
			.all()
			.some((c) => c.name === "project_filter_id");
		for (const [table, columns] of Object.entries({
			boards: {
				project_filter_id: "TEXT",
				project_filter_name: "TEXT",
				project: "TEXT",
				source: "TEXT NOT NULL DEFAULT 'local'",
				linear_team_id: "TEXT",
				linear_project_id: "TEXT",
				linear_org_id: "TEXT",
			},
			tasks: {
				linear_project_id: "TEXT",
				linear_issue_id: "TEXT",
				linear_identifier: "TEXT",
				linear_url: "TEXT",
			},
		})) {
			const existing = new Set(
				db
					.query<{ name: string }, []>(`PRAGMA table_info(${table})`)
					.all()
					.map((c) => c.name),
			);
			for (const [name, type] of Object.entries(columns)) {
				if (!existing.has(name))
					db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
			}
		}
		db.exec(`CREATE TABLE IF NOT EXISTS board_projects (
 board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
 id TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY(board_id,id)
 ); CREATE INDEX IF NOT EXISTS idx_task_project ON tasks(board_id,linear_project_id)`);
		if (!hadProjectFilter) {
			db.exec(`UPDATE boards SET project_filter_id=linear_project_id, project_filter_name=project WHERE source='linear';
  UPDATE tasks SET linear_project_id=(SELECT linear_project_id FROM boards WHERE id=tasks.board_id) WHERE linear_issue_id IS NOT NULL;
  INSERT OR IGNORE INTO board_projects(board_id,id,name) SELECT id,linear_project_id,COALESCE(project,'Pending sync') FROM boards WHERE linear_project_id IS NOT NULL;`);
		}
		db.exec(
			"CREATE UNIQUE INDEX IF NOT EXISTS idx_linear_issue ON tasks(board_id, linear_issue_id)",
		);
		db.exec(
			"CREATE UNIQUE INDEX IF NOT EXISTS idx_linear_board ON boards(linear_org_id, linear_team_id, COALESCE(linear_project_id, '')) WHERE source = 'linear' AND archived = 0",
		);
	})();
}
