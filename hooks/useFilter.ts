import type { Priority, TaskStatus, TaskWithTags } from "@types";
import { useMemo, useState } from "react";

export interface FilterState {
	status: TaskStatus | null;
	priority: Priority | null;
	tags: string[];
	showArchived: boolean;
}

const defaultFilter: FilterState = {
	status: null,
	priority: null,
	tags: [],
	showArchived: false,
};

export function useFilter(tasks: TaskWithTags[]) {
	const [filter, setFilter] = useState<FilterState>(defaultFilter);
	const [isFiltering, setIsFiltering] = useState(false);

	const filteredTasks = useMemo(() => {
		return tasks.filter((task) => {
			if (filter.status && task.status !== filter.status) {
				return false;
			}

			if (filter.priority && task.priority !== filter.priority) {
				return false;
			}

			if (filter.tags.length > 0) {
				const taskTagNames = task.tags.map((t) => t.name.toLowerCase());
				const hasAllTags = filter.tags.every((tag) =>
					taskTagNames.includes(tag.toLowerCase()),
				);
				if (!hasAllTags) return false;
			}

			return true;
		});
	}, [tasks, filter]);

	const setStatusFilter = (status: TaskStatus | null) => {
		setFilter((prev) => ({ ...prev, status }));
	};

	const setPriorityFilter = (priority: Priority | null) => {
		setFilter((prev) => ({ ...prev, priority }));
	};

	const toggleTagFilter = (tag: string) => {
		setFilter((prev) => ({
			...prev,
			tags: prev.tags.includes(tag)
				? prev.tags.filter((t) => t !== tag)
				: [...prev.tags, tag],
		}));
	};

	const clearFilters = () => {
		setFilter(defaultFilter);
	};

	const openFilter = () => setIsFiltering(true);
	const closeFilter = () => setIsFiltering(false);

	const hasActiveFilters =
		filter.status !== null ||
		filter.priority !== null ||
		filter.tags.length > 0;

	return {
		filter,
		filteredTasks,
		setStatusFilter,
		setPriorityFilter,
		toggleTagFilter,
		clearFilters,
		isFiltering,
		openFilter,
		closeFilter,
		hasActiveFilters,
	};
}
