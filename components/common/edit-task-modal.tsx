import type { Priority, TaskStatus, TaskWithTags } from "@types";
import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { Input } from "./input";
import { Modal } from "./modal";

interface EditTaskModalProps {
	task: TaskWithTags;
	onSave: (updates: TaskUpdates) => void;
	onCancel: () => void;
}

export interface TaskUpdates {
	title?: string;
	description?: string;
	status?: TaskStatus;
	priority?: Priority;
	due_date?: string | null;
	tags?: string[];
}

type EditField =
	| "title"
	| "description"
	| "status"
	| "priority"
	| "dueDate"
	| "tags";

const fields: EditField[] = [
	"title",
	"description",
	"status",
	"priority",
	"dueDate",
	"tags",
];
const statuses: TaskStatus[] = ["todo", "doing", "done"];
const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export function EditTaskModal({ task, onSave, onCancel }: EditTaskModalProps) {
	const [activeField, setActiveField] = useState<EditField>("title");
	const [isEditing, setIsEditing] = useState(false);

	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description);
	const [status, setStatus] = useState<TaskStatus>(task.status);
	const [priority, setPriority] = useState<Priority>(task.priority);
	const [dueDate, setDueDate] = useState(task.due_date ?? "");
	const [tags, setTags] = useState(task.tags.map((t) => t.name).join(", "));
	const originalTags = task.tags.map((t) => t.name).join(", ");

	const fieldIndex = fields.indexOf(activeField);

	useInput(
		(input, key) => {
			if (isEditing) return;

			if (key.escape) {
				onCancel();
				return;
			}

			if (key.upArrow) {
				setActiveField(fields[Math.max(0, fieldIndex - 1)] ?? "title");
			} else if (key.downArrow) {
				setActiveField(
					fields[Math.min(fields.length - 1, fieldIndex + 1)] ?? "tags",
				);
			} else if (key.return) {
				if (activeField === "status") {
					const idx = statuses.indexOf(status);
					setStatus(statuses[(idx + 1) % statuses.length] ?? "todo");
				} else if (activeField === "priority") {
					const idx = priorities.indexOf(priority);
					setPriority(priorities[(idx + 1) % priorities.length] ?? "medium");
				} else if (
					activeField === "title" ||
					activeField === "description" ||
					activeField === "dueDate" ||
					activeField === "tags"
				) {
					setIsEditing(true);
				}
			} else if (key.leftArrow) {
				if (activeField === "status") {
					const idx = statuses.indexOf(status);
					setStatus(
						statuses[(idx - 1 + statuses.length) % statuses.length] ?? "todo",
					);
				} else if (activeField === "priority") {
					const idx = priorities.indexOf(priority);
					setPriority(
						priorities[(idx - 1 + priorities.length) % priorities.length] ??
							"medium",
					);
				}
			} else if (key.rightArrow) {
				if (activeField === "status") {
					const idx = statuses.indexOf(status);
					setStatus(statuses[(idx + 1) % statuses.length] ?? "todo");
				} else if (activeField === "priority") {
					const idx = priorities.indexOf(priority);
					setPriority(priorities[(idx + 1) % priorities.length] ?? "medium");
				}
			} else if (input === "s" || input === "S") {
				const updates: TaskUpdates = {};
				if (title !== task.title) updates.title = title;
				if (description !== task.description) updates.description = description;
				if (status !== task.status) updates.status = status;
				if (priority !== task.priority) updates.priority = priority;
				if (dueDate !== (task.due_date ?? "")) {
					updates.due_date = dueDate || null;
				}
				if (tags !== originalTags) {
					updates.tags = tags
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t.length > 0);
				}
				onSave(updates);
			}
		},
		{ isActive: !isEditing },
	);

	const handleFieldSubmit = (value: string) => {
		if (activeField === "title") setTitle(value);
		else if (activeField === "description") setDescription(value);
		else if (activeField === "dueDate") setDueDate(value);
		else if (activeField === "tags") setTags(value);
		setIsEditing(false);
	};

	const getFieldValue = (): string => {
		if (activeField === "title") return title;
		if (activeField === "description") return description;
		if (activeField === "dueDate") return dueDate;
		if (activeField === "tags") return tags;
		return "";
	};

	const renderField = (field: EditField) => {
		const isActive = activeField === field;
		const labelWidth = 12;

		let display: React.ReactNode;

		switch (field) {
			case "title":
				display = <Text>{title || "(empty)"}</Text>;
				break;
			case "description":
				display = (
					<Text dimColor={!description}>
						{description
							? description.length > 40
								? `${description.slice(0, 40)}...`
								: description
							: "(empty)"}
					</Text>
				);
				break;
			case "status":
				display = (
					<Box gap={1}>
						{statuses.map((s) => (
							<Text
								key={s}
								inverse={s === status}
								color={s === status ? "cyan" : undefined}
								dimColor={s !== status}
							>
								{" "}
								{s.toUpperCase()}{" "}
							</Text>
						))}
					</Box>
				);
				break;
			case "priority":
				display = (
					<Box gap={1}>
						{priorities.map((p) => (
							<Text
								key={p}
								inverse={p === priority}
								color={
									p === priority
										? p === "urgent"
											? "red"
											: p === "high"
												? "yellow"
												: p === "low"
													? "gray"
													: "cyan"
										: undefined
								}
								dimColor={p !== priority}
							>
								{" "}
								{p.toUpperCase()}{" "}
							</Text>
						))}
					</Box>
				);
				break;
			case "dueDate":
				display = (
					<Text dimColor={!dueDate}>{dueDate || "(none) YYYY-MM-DD"}</Text>
				);
				break;
			case "tags":
				display = (
					<Text dimColor={!tags}>{tags || "(none) comma-separated"}</Text>
				);
				break;
		}

		const labels: Record<EditField, string> = {
			title: "Title",
			description: "Description",
			status: "Status",
			priority: "Priority",
			dueDate: "Due Date",
			tags: "Tags",
		};

		if (
			isEditing &&
			isActive &&
			(field === "title" ||
				field === "description" ||
				field === "dueDate" ||
				field === "tags")
		) {
			return (
				<Box key={field}>
					<Box width={labelWidth}>
						<Text color="cyan">{labels[field]}:</Text>
					</Box>
					<Input
						value={getFieldValue()}
						onChange={(v) => {
							if (field === "title") setTitle(v);
							else if (field === "description") setDescription(v);
							else if (field === "dueDate") setDueDate(v);
							else if (field === "tags") setTags(v);
						}}
						onSubmit={handleFieldSubmit}
						onCancel={() => setIsEditing(false)}
						placeholder={
							field === "dueDate"
								? "YYYY-MM-DD"
								: field === "tags"
									? "tag1, tag2, ..."
									: undefined
						}
					/>
				</Box>
			);
		}

		return (
			<Box key={field}>
				<Box width={labelWidth}>
					<Text color={isActive ? "cyan" : undefined} bold={isActive}>
						{labels[field]}:
					</Text>
				</Box>
				<Text inverse={isActive && !isEditing}>{isActive ? " " : ""}</Text>
				{display}
				<Text inverse={isActive && !isEditing}>{isActive ? " " : ""}</Text>
			</Box>
		);
	};

	return (
		<Modal title="Edit Task">
			<Box flexDirection="column" gap={1}>
				{fields.map(renderField)}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text dimColor>↑/↓ Navigate • Enter Edit • ←/→ Cycle options</Text>
				<Text dimColor>S Save • Esc Cancel</Text>
			</Box>
		</Modal>
	);
}
