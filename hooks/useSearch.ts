import type { TaskWithTags } from "@types";
import { fuzzySearch } from "@utils/fuzzy";
import { useMemo, useState } from "react";

export function useSearch(tasks: TaskWithTags[]) {
	const [query, setQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);

	const results = useMemo(() => {
		if (!query.trim()) {
			return tasks;
		}

		const matches = fuzzySearch(tasks, query, (task) => {
			const parts = [
				task.title,
				task.description,
				...task.tags.map((t) => t.name),
			];
			return parts.join(" ");
		});

		return matches.map((m) => m.item);
	}, [tasks, query]);

	const openSearch = () => setIsSearching(true);
	const closeSearch = () => {
		setIsSearching(false);
		setQuery("");
	};

	return {
		query,
		setQuery,
		results,
		isSearching,
		openSearch,
		closeSearch,
		hasResults: results.length > 0,
		resultCount: results.length,
	};
}
