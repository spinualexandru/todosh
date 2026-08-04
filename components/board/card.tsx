import { Text } from "@components/common";
import type { TaskWithTags } from "@types";
import { attrs, DIM, fallbackGlyphs, glyphs, inkColor } from "@utils";

interface CardProps {
	task: TaskWithTags;
	isSelected: boolean;
	isFocused: boolean;
	useNerdfonts: boolean;
	width: number;
	/** Stable id so the parent scrollbox can scroll this card into view. */
	id?: string;
}

const priorityColors: Record<string, string> = {
	low: "gray",
	medium: "white",
	high: "yellow",
	urgent: "red",
};

export function Card({
	task,
	isSelected,
	isFocused,
	useNerdfonts,
	width,
	id,
}: CardProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const priorityColor = priorityColors[task.priority] ?? "white";

	const maxTitleLen = width - 6;
	const displayTitle =
		task.title.length > maxTitleLen
			? `${task.title.slice(0, maxTitleLen - 1)}…`
			: task.title;

	return (
		<box
			id={id}
			flexDirection="column"
			border
			borderStyle={isSelected && isFocused ? "double" : "single"}
			borderColor={inkColor(
				isSelected && isFocused ? "red" : isSelected ? "blue" : "gray",
			)}
			width={width}
			paddingX={1}
		>
			<box flexDirection="row">
				<Text
					fg={inkColor(priorityColor)}
					attributes={attrs({
						bold: task.priority === "urgent" || task.priority === "high",
					})}
				>
					{icons.priority[task.priority]}{" "}
				</Text>
				<Text
					attributes={attrs({ bold: isSelected })}
					fg={isSelected ? inkColor("white") : undefined}
				>
					{displayTitle}
				</Text>
			</box>
			{(task.due_date || task.tags.length > 0) && (
				<box flexDirection="row" gap={1}>
					{task.due_date && (
						<Text attributes={DIM}>
							{icons.calendar} {formatDate(task.due_date)}
						</Text>
					)}
					{task.tags.slice(0, 2).map((tag) => (
						<Text key={tag.id} fg={inkColor(tag.color)}>
							{icons.tag}
							{tag.name}
						</Text>
					))}
					{task.tags.length > 2 && (
						<Text attributes={DIM}>+{task.tags.length - 2}</Text>
					)}
				</box>
			)}
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
