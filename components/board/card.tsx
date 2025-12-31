import type { TaskWithTags } from "@types";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";

interface CardProps {
	task: TaskWithTags;
	isSelected: boolean;
	isFocused: boolean;
	useNerdfonts: boolean;
	width: number;
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
}: CardProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const priorityColor = priorityColors[task.priority] ?? "white";

	const maxTitleLen = width - 6;
	const displayTitle =
		task.title.length > maxTitleLen
			? `${task.title.slice(0, maxTitleLen - 1)}…`
			: task.title;

	return (
		<Box
			flexDirection="column"
			borderStyle={isSelected && isFocused ? "round" : "single"}
			borderColor={
				isSelected && isFocused ? "cyan" : isSelected ? "blue" : "gray"
			}
			width={width}
			paddingX={1}
		>
			<Box>
				<Text
					color={priorityColor}
					bold={task.priority === "urgent" || task.priority === "high"}
				>
					{icons.priority[task.priority]}{" "}
				</Text>
				<Text bold={isSelected} color={isSelected ? "white" : undefined}>
					{displayTitle}
				</Text>
			</Box>
			{(task.due_date || task.tags.length > 0) && (
				<Box gap={1}>
					{task.due_date && (
						<Text dimColor>
							{icons.calendar} {formatDate(task.due_date)}
						</Text>
					)}
					{task.tags.slice(0, 2).map((tag) => (
						<Text key={tag.id} color={tag.color as never}>
							{icons.tag}
							{tag.name}
						</Text>
					))}
					{task.tags.length > 2 && (
						<Text dimColor>+{task.tags.length - 2}</Text>
					)}
				</Box>
			)}
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
