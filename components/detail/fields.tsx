import type { Priority, Tag, TaskStatus } from "@types";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";

interface FieldsProps {
	status: TaskStatus;
	priority: Priority;
	dueDate: string | null;
	tags: Tag[];
	createdAt: string;
	updatedAt: string;
	useNerdfonts: boolean;
}

const statusLabels: Record<TaskStatus, string> = {
	todo: "TO DO",
	doing: "DOING",
	done: "DONE",
};

const statusColors: Record<TaskStatus, string> = {
	todo: "blue",
	doing: "yellow",
	done: "green",
};

const priorityColors: Record<Priority, string> = {
	low: "gray",
	medium: "white",
	high: "yellow",
	urgent: "red",
};

export function Fields({
	status,
	priority,
	dueDate,
	tags,
	createdAt,
	updatedAt,
	useNerdfonts,
}: FieldsProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="single"
				borderBottom
				borderTop={false}
				borderLeft={false}
				borderRight={false}
				borderColor="gray"
			>
				<Text bold color="cyan">
					Details
				</Text>
			</Box>

			<Field label="Status">
				<Text color={statusColors[status] as never}>
					{icons.column[status]} {statusLabels[status]}
				</Text>
			</Field>

			<Field label="Priority">
				<Text color={priorityColors[priority] as never}>
					{icons.priority[priority]}{" "}
					{priority.charAt(0).toUpperCase() + priority.slice(1)}
				</Text>
			</Field>

			<Field label="Due Date">
				{dueDate ? (
					<Text>
						{icons.calendar} {formatDate(dueDate)}
					</Text>
				) : (
					<Text dimColor>Not set</Text>
				)}
			</Field>

			<Field label="Tags">
				{tags.length > 0 ? (
					<Box flexDirection="column">
						{tags.map((tag) => (
							<Text key={tag.id} color={tag.color as never}>
								{icons.tag} {tag.name}
							</Text>
						))}
					</Box>
				) : (
					<Text dimColor>No tags</Text>
				)}
			</Field>

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>Created: {formatDateTime(createdAt)}</Text>
				<Text dimColor>Updated: {formatDateTime(updatedAt)}</Text>
			</Box>
		</Box>
	);
}

interface FieldProps {
	label: string;
	children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
	return (
		<Box flexDirection="column">
			<Text dimColor>{label}</Text>
			<Box marginLeft={1}>{children}</Box>
		</Box>
	);
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffDays = Math.ceil(
		(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (diffDays < 0) return `${dateStr} (overdue)`;
	if (diffDays === 0) return `${dateStr} (today)`;
	if (diffDays === 1) return `${dateStr} (tomorrow)`;
	return dateStr;
}

function formatDateTime(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
