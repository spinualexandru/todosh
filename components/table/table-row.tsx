import type { TaskWithTags } from "@types";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";
import type { ColumnConfig } from "./table-header";

interface TableRowProps {
	task: TaskWithTags;
	isSelected: boolean;
	useNerdfonts: boolean;
	columns: ColumnConfig[];
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
}: TableRowProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;

	const renderCell = (key: string, width: number) => {
		switch (key) {
			case "title": {
				const maxLen = width - 4;
				const title =
					task.title.length > maxLen
						? `${task.title.slice(0, maxLen - 1)}…`
						: task.title;
				return <Text color={isSelected ? "black" : undefined}>{title}</Text>;
			}
			case "status":
				return (
					<Text
						color={isSelected ? "black" : (statusColors[task.status] as never)}
					>
						{icons.column[task.status]} {task.status.toUpperCase()}
					</Text>
				);
			case "priority":
				return (
					<Text
						color={
							isSelected ? "black" : (priorityColors[task.priority] as never)
						}
					>
						{icons.priority[task.priority]} {task.priority}
					</Text>
				);
			case "due_date":
				return (
					<Text
						dimColor={!task.due_date}
						color={isSelected ? "black" : undefined}
					>
						{task.due_date ? formatDate(task.due_date) : "-"}
					</Text>
				);
			case "tags":
				if (task.tags.length === 0)
					return (
						<Text dimColor color={isSelected ? "black" : undefined}>
							-
						</Text>
					);
				return (
					<Text color={isSelected ? "black" : undefined}>
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
		<Box paddingX={1} backgroundColor={isSelected ? "blue" : undefined}>
			{columns.map((col, i) => (
				<Box key={col.key} width={col.width}>
					<Box flexGrow={1}>{renderCell(col.key, col.width)}</Box>
					{i < columns.length - 1 && (
						<Text dimColor color={isSelected ? "red" : undefined}>
							{icons.border.vertical}
						</Text>
					)}
				</Box>
			))}
		</Box>
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
