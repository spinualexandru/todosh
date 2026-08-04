import { useKeys } from "@hooks";
import type { Priority, TaskStatus, TaskWithTags } from "@types";
import { attrs, DIM, inkColor, selection } from "@utils";
import { useState } from "react";
import { Input } from "./input";
import { Modal } from "./modal";
import { Text } from "./text";

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

const priorityColors: Record<Priority, string> = {
	urgent: "red",
	high: "yellow",
	low: "gray",
	medium: "cyan",
};

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

	const cycle = (delta: number) => {
		if (activeField === "status") {
			const idx = statuses.indexOf(status);
			setStatus(
				statuses[(idx + delta + statuses.length) % statuses.length] ?? "todo",
			);
		} else if (activeField === "priority") {
			const idx = priorities.indexOf(priority);
			setPriority(
				priorities[(idx + delta + priorities.length) % priorities.length] ??
					"medium",
			);
		}
	};

	const save = () => {
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
	};

	useKeys(
		{
			escape: onCancel,
			up: () => setActiveField(fields[Math.max(0, fieldIndex - 1)] ?? "title"),
			down: () =>
				setActiveField(
					fields[Math.min(fields.length - 1, fieldIndex + 1)] ?? "tags",
				),
			return: () => {
				if (activeField === "status" || activeField === "priority") {
					cycle(1);
				} else {
					setIsEditing(true);
				}
			},
			left: () => cycle(-1),
			right: () => cycle(1),
			s: save,
			S: save,
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
					<Text attributes={attrs({ dim: !description })}>
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
					<box flexDirection="row" gap={1}>
						{statuses.map((s) => (
							<Text
								key={s}
								attributes={attrs({ dim: s !== status })}
								{...selection(s === status, "cyan")}
							>
								{" "}
								{s.toUpperCase()}{" "}
							</Text>
						))}
					</box>
				);
				break;
			case "priority":
				display = (
					<box flexDirection="row" gap={1}>
						{priorities.map((p) => (
							<Text
								key={p}
								attributes={attrs({ dim: p !== priority })}
								{...selection(p === priority, priorityColors[p])}
							>
								{" "}
								{p.toUpperCase()}{" "}
							</Text>
						))}
					</box>
				);
				break;
			case "dueDate":
				display = (
					<Text attributes={attrs({ dim: !dueDate })}>
						{dueDate || "(none) YYYY-MM-DD"}
					</Text>
				);
				break;
			case "tags":
				display = (
					<Text attributes={attrs({ dim: !tags })}>
						{tags || "(none) comma-separated"}
					</Text>
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
				<box key={field} flexDirection="row">
					<box width={labelWidth}>
						<Text fg={inkColor("cyan")}>{labels[field]}:</Text>
					</box>
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
				</box>
			);
		}

		return (
			<box key={field} flexDirection="row">
				<box width={labelWidth}>
					<Text
						fg={isActive ? inkColor("cyan") : undefined}
						attributes={attrs({ bold: isActive })}
					>
						{labels[field]}:
					</Text>
				</box>
				<Text {...selection(isActive && !isEditing)}>
					{isActive ? " " : ""}
				</Text>
				{display}
				<Text {...selection(isActive && !isEditing)}>
					{isActive ? " " : ""}
				</Text>
			</box>
		);
	};

	return (
		<Modal title="Edit Task">
			<box flexDirection="column" gap={1}>
				{fields.map(renderField)}
			</box>
			<box marginTop={1} flexDirection="column">
				<Text attributes={DIM}>
					↑/↓ Navigate • Enter Edit • ←/→ Cycle options
				</Text>
				<Text attributes={DIM}>S Save • Esc Cancel</Text>
			</box>
		</Modal>
	);
}
