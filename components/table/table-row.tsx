import { Text } from "@components/common";
import type { TaskWithTags } from "@types";
import { attrs, DIM, fallbackGlyphs, glyphs, inkColor } from "@utils";
import type { ColumnConfig } from "./table-header";

interface TableRowProps {
	task: TaskWithTags;
	isSelected: boolean;
	useNerdfonts: boolean;
	columns: ColumnConfig[];
	/** Stable id so the parent scrollbox can scroll this row into view. */
	id?: string;
}

const priorityColors: Record<string, string> = {
	low: "gray",
	medium: "white",
	high: "yellow",
	urgent: "red",
};

const statusColors: Record<string, string> = {
	todo: "blue",
	doing: "yellow",
	done: "green",
};

export function TableRow({
	task,
	isSelected,
	useNerdfonts,
	columns,
	id,
}: TableRowProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const selectedFg = isSelected ? inkColor("black") : undefined;

	const renderCell = (key: string, width: number) => {
		switch (key) {
			case "title": {
				const maxLen = width - 4;
				const title =
					task.title.length > maxLen
						? `${task.title.slice(0, maxLen - 1)}…`
						: task.title;
				return <Text fg={selectedFg}>{title}</Text>;
			}
			case "status":
				return (
					<Text fg={selectedFg ?? inkColor(statusColors[task.status] ?? "")}>
						{icons.column[task.status]} {task.status.toUpperCase()}
					</Text>
				);
			case "priority":
				return (
					<Text
						fg={selectedFg ?? inkColor(priorityColors[task.priority] ?? "")}
					>
						{icons.priority[task.priority]} {task.priority}
					</Text>
				);
			case "due_date":
				return (
					<Text attributes={attrs({ dim: !task.due_date })} fg={selectedFg}>
						{task.due_date ? formatDate(task.due_date) : "-"}
					</Text>
				);
			case "tags":
				if (task.tags.length === 0)
					return (
						<Text attributes={DIM} fg={selectedFg}>
							-
						</Text>
					);
				return (
					<Text fg={selectedFg}>
						{task.tags
							.slice(0, 2)
							.map((t) => t.name)
							.join(", ")}
						{task.tags.length > 2 && ` +${task.tags.length - 2}`}
					</Text>
				);
			default:
				return null;
		}
	};

	return (
		<box
			id={id}
			flexDirection="row"
			paddingX={1}
			backgroundColor={isSelected ? inkColor("blue") : undefined}
		>
			{columns.map((col, i) => (
				<box key={col.key} flexDirection="row" width={col.width}>
					<box flexDirection="row" flexGrow={1}>
						{renderCell(col.key, col.width)}
					</box>
					{i < columns.length - 1 && (
						<Text
							attributes={DIM}
							fg={isSelected ? inkColor("red") : undefined}
						>
							{icons.border.vertical}
						</Text>
					)}
				</box>
			))}
		</box>
	);
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffDays = Math.ceil(
		(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (diffDays < 0) return "overdue";
	if (diffDays === 0) return "today";
	if (diffDays === 1) return "tomorrow";
	if (diffDays < 7) return `${diffDays}d`;

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
