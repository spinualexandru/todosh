import { Text } from "@components/common";
import { useKeys } from "@hooks";
import type { FilterState } from "@hooks/useFilter";
import type { Priority, TaskStatus } from "@types";
import {
	attrs,
	BOLD,
	DIM,
	fallbackGlyphs,
	glyphs,
	inkColor,
	optionalInkColor,
	selection,
} from "@utils";
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

	const step = (delta: number) => {
		if (activeRow === "status") {
			const newIdx = Math.min(
				statuses.length - 1,
				Math.max(0, statusIdx + delta),
			);
			setStatusIdx(newIdx);
			onStatusChange(statuses[newIdx] ?? null);
		} else {
			const newIdx = Math.min(
				priorities.length - 1,
				Math.max(0, priorityIdx + delta),
			);
			setPriorityIdx(newIdx);
			onPriorityChange(priorities[newIdx] ?? null);
		}
	};

	const clear = () => {
		onClear();
		setStatusIdx(0);
		setPriorityIdx(0);
	};

	useKeys({
		escape: onClose,
		c: clear,
		up: () => setActiveRow("status"),
		k: () => setActiveRow("status"),
		down: () => setActiveRow("priority"),
		j: () => setActiveRow("priority"),
		left: () => step(-1),
		h: () => step(-1),
		right: () => step(1),
		l: () => step(1),
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
		<box
			flexDirection="column"
			border
			borderStyle="rounded"
			borderColor={inkColor("cyan")}
			paddingX={1}
			marginBottom={1}
		>
			<box flexDirection="row" marginBottom={1}>
				<Text fg={inkColor("cyan")} attributes={BOLD}>
					{icons.filter} Filters
				</Text>
				<box flexGrow={1} />
				<Text attributes={DIM}>c=clear • Esc=close</Text>
			</box>

			<box flexDirection="row">
				<Text
					attributes={BOLD}
					fg={activeRow === "status" ? inkColor("cyan") : undefined}
				>
					Status:{" "}
				</Text>
				{statuses.map((status, i) => (
					<Text
						key={status ?? "all"}
						attributes={attrs({
							dim: statusIdx !== i && activeRow !== "status",
						})}
						fg={status ? optionalInkColor(statusColors[status]) : undefined}
						{...selection(
							statusIdx === i,
							status ? statusColors[status] : undefined,
						)}
					>
						{" "}
						{status ? status.toUpperCase() : "ALL"}{" "}
					</Text>
				))}
			</box>

			<box flexDirection="row">
				<Text
					attributes={BOLD}
					fg={activeRow === "priority" ? inkColor("cyan") : undefined}
				>
					Priority:{" "}
				</Text>
				{priorities.map((priority, i) => (
					<Text
						key={priority ?? "all"}
						attributes={attrs({
							dim: priorityIdx !== i && activeRow !== "priority",
						})}
						fg={
							priority ? optionalInkColor(priorityColors[priority]) : undefined
						}
						{...selection(
							priorityIdx === i,
							priority ? priorityColors[priority] : undefined,
						)}
					>
						{" "}
						{priority ? priority.toUpperCase() : "ALL"}{" "}
					</Text>
				))}
			</box>
		</box>
	);
}
