import { Text } from "@components/common";
import type { Priority, Tag, TaskStatus } from "@types";
import { BOLD, DIM, fallbackGlyphs, glyphs, inkColor } from "@utils";

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
		<box flexDirection="column" gap={1}>
			<box
				flexDirection="row"
				border={["bottom"]}
				borderStyle="single"
				borderColor={inkColor("gray")}
			>
				<Text attributes={BOLD} fg={inkColor("cyan")}>
					Details
				</Text>
			</box>

			<Field label="Status">
				<Text fg={inkColor(statusColors[status])}>
					{icons.column[status]} {statusLabels[status]}
				</Text>
			</Field>

			<Field label="Priority">
				<Text fg={inkColor(priorityColors[priority])}>
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
					<Text attributes={DIM}>Not set</Text>
				)}
			</Field>

			<Field label="Tags">
				{tags.length > 0 ? (
					<box flexDirection="column">
						{tags.map((tag) => (
							<Text key={tag.id} fg={inkColor(tag.color)}>
								{icons.tag} {tag.name}
							</Text>
						))}
					</box>
				) : (
					<Text attributes={DIM}>No tags</Text>
				)}
			</Field>

			<box marginTop={1} flexDirection="column">
				<Text attributes={DIM}>Created: {formatDateTime(createdAt)}</Text>
				<Text attributes={DIM}>Updated: {formatDateTime(updatedAt)}</Text>
			</box>
		</box>
	);
}

interface FieldProps {
	label: string;
	children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
	return (
		<box flexDirection="column">
			<Text attributes={DIM}>{label}</Text>
			<box flexDirection="row" marginLeft={1}>
				{children}
			</box>
		</box>
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
