import type { Board } from "@types";

/** The remote ID is the link; names can be absent until an older board syncs. */
export function boardProject(board: Board): string {
	if (board.source !== "linear") return board.project ?? "Not set";
	if (!board.project_filter_id) return "All projects";
	return board.project_filter_name ?? "Pending sync";
}
