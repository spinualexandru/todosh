import type { FilterState } from "@hooks/useFilter";
import type { Priority, TaskStatus } from "@types";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text, useInput } from "ink";
import { useState } from "react";

interface FilterMenuProps {
	filter: FilterState;
	onStatusChange: (status: TaskStatus | null) => void;
	onPriorityChange: (priority: Priority | null) => void;
	onClear: () => void;
	onClose: () => void;
	useNerdfonts: boolean;
}

const statuses: (TaskStatus | null)[] = [null, "todo", "doing", "done"];
const priorities: (Priority | null)[] = [
	null,
	"low",
	"medium",
	"high",
	"urgent",
];

type FilterRow = "status" | "priority";

export function FilterMenu({
	filter,
	onStatusChange,
	onPriorityChange,
	onClear,
	onClose,
	useNerdfonts,
}: FilterMenuProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const [activeRow, setActiveRow] = useState<FilterRow>("status");
	const [statusIdx, setStatusIdx] = useState(statuses.indexOf(filter.status));
	const [priorityIdx, setPriorityIdx] = useState(
		priorities.indexOf(filter.priority),
	);

	useInput((input, key) => {
		if (key.escape) {
			onClose();
			return;
		}

		if (input === "c") {
			onClear();
			setStatusIdx(0);
			setPriorityIdx(0);
			return;
		}

		if (key.upArrow || input === "k") {
			setActiveRow("status");
			return;
		}

		if (key.downArrow || input === "j") {
			setActiveRow("priority");
			return;
		}

		if (key.leftArrow || input === "h") {
			if (activeRow === "status") {
				const newIdx = Math.max(0, statusIdx - 1);
				setStatusIdx(newIdx);
				onStatusChange(statuses[newIdx] ?? null);
			} else {
				const newIdx = Math.max(0, priorityIdx - 1);
				setPriorityIdx(newIdx);
				onPriorityChange(priorities[newIdx] ?? null);
			}
			return;
		}

		if (key.rightArrow || input === "l") {
			if (activeRow === "status") {
				const newIdx = Math.min(statuses.length - 1, statusIdx + 1);
				setStatusIdx(newIdx);
				onStatusChange(statuses[newIdx] ?? null);
			} else {
				const newIdx = Math.min(priorities.length - 1, priorityIdx + 1);
				setPriorityIdx(newIdx);
				onPriorityChange(priorities[newIdx] ?? null);
			}
		}
	});

	const statusColors: Record<string, string> = {
		todo: "blue",
		doing: "yellow",
		done: "green",
	};

	const priorityColors: Record<string, string> = {
		low: "gray",
		medium: "white",
		high: "yellow",
		urgent: "red",
	};

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={1}
			marginBottom={1}
		>
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					{icons.filter} Filters
				</Text>
				<Box flexGrow={1} />
				<Text dimColor>c=clear • Esc=close</Text>
			</Box>

			<Box>
				<Text bold color={activeRow === "status" ? "cyan" : undefined}>
					Status:{" "}
				</Text>
				{statuses.map((status, i) => (
					<Text
						key={status ?? "all"}
						inverse={statusIdx === i}
						color={status ? (statusColors[status] as never) : undefined}
						dimColor={statusIdx !== i && activeRow !== "status"}
					>
						{" "}
						{status ? status.toUpperCase() : "ALL"}{" "}
					</Text>
				))}
			</Box>

			<Box>
				<Text bold color={activeRow === "priority" ? "cyan" : undefined}>
					Priority:{" "}
				</Text>
				{priorities.map((priority, i) => (
					<Text
						key={priority ?? "all"}
						inverse={priorityIdx === i}
						color={priority ? (priorityColors[priority] as never) : undefined}
						dimColor={priorityIdx !== i && activeRow !== "priority"}
					>
						{" "}
						{priority ? priority.toUpperCase() : "ALL"}{" "}
					</Text>
				))}
			</Box>
		</Box>
	);
}
