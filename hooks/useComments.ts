import type { Comment } from "@types";
import { useCallback, useEffect, useState } from "react";
import { useDatabase } from "./useDatabase";

export function useComments(taskId: number) {
	const db = useDatabase();
	const [comments, setComments] = useState<Comment[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchComments = useCallback(() => {
		const query = db.query<Comment, [number]>(`
			SELECT * FROM comments
			WHERE task_id = ?
			ORDER BY created_at ASC
		`);
		const results = query.all(taskId);
		setComments(results);
		setIsLoading(false);
	}, [db, taskId]);

	useEffect(() => {
		fetchComments();
	}, [fetchComments]);

	const addComment = useCallback(
		(content: string): Comment => {
			const stmt = db.query<Comment, [number, string]>(`
				INSERT INTO comments (task_id, content)
				VALUES (?, ?)
				RETURNING *
			`);
			const comment = stmt.get(taskId, content);
			if (!comment) throw new Error("Failed to create comment");
			fetchComments();
			return comment;
		},
		[db, taskId, fetchComments],
	);

	const updateComment = useCallback(
		(id: number, content: string): Comment | null => {
			const stmt = db.query<Comment, [string, number]>(`
				UPDATE comments
				SET content = ?, updated_at = datetime('now')
				WHERE id = ?
				RETURNING *
			`);
			const comment = stmt.get(content, id);
			fetchComments();
			return comment ?? null;
		},
		[db, fetchComments],
	);

	const deleteComment = useCallback(
		(id: number): boolean => {
			db.query(`DELETE FROM comments WHERE id = ?`).run(id);
			fetchComments();
			return true;
		},
		[db, fetchComments],
	);

	return {
		comments,
		isLoading,
		addComment,
		updateComment,
		deleteComment,
		refresh: fetchComments,
	};
}
