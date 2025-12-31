import { Input, Modal } from "@components/common";
import { CommentList, Description, Fields } from "@components/detail";
import { Shell } from "@components/layout";
import {
	getTerminalSize,
	useBoards,
	useKeymap,
	useRouter,
	useSettings,
} from "@hooks";
import { useComments } from "@hooks/useComments";
import { useTasks } from "@hooks/useTasks";
import type { Priority, TaskStatus } from "@types";
import { Box, Text, useStdout } from "ink";
import { useState } from "react";

interface DetailViewProps {
	boardId: number;
	taskId: number;
}

type FocusArea = "description" | "comments" | "fields";
type ModalState =
	| { type: "none" }
	| { type: "addComment" }
	| { type: "editTitle" }
	| { type: "editDescription" }
	| { type: "editStatus" }
	| { type: "editPriority" };

const statuses: TaskStatus[] = ["todo", "doing", "done"];
const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export function DetailView({ boardId, taskId }: DetailViewProps) {
	const { stdout } = useStdout();
	const { columns, rows } = getTerminalSize(stdout);
	const { getBoard } = useBoards();
	const { getTask, updateTask } = useTasks(boardId);
	const { comments, addComment } = useComments(taskId);
	const { goBack } = useRouter();
	const { settings } = useSettings();

	const board = getBoard(boardId);
	const task = getTask(taskId);

	const [focusArea, setFocusArea] = useState<FocusArea>("description");
	const [commentIndex, setCommentIndex] = useState(0);
	const [modal, setModal] = useState<ModalState>({ type: "none" });
	const [inputValue, setInputValue] = useState("");

	const isModalOpen = modal.type !== "none";

	useKeymap({
		isActive: !isModalOpen,
		handlers: {
			onLeft: () => {
				if (focusArea === "fields") setFocusArea("description");
				else if (focusArea === "comments") setFocusArea("description");
			},
			onRight: () => {
				if (focusArea === "description") setFocusArea("fields");
				else if (focusArea === "comments") setFocusArea("fields");
			},
			onUp: () => {
				if (focusArea === "comments") {
					setCommentIndex((i) => Math.max(0, i - 1));
				} else if (focusArea === "description") {
					setFocusArea("comments");
				}
			},
			onDown: () => {
				if (focusArea === "comments") {
					setCommentIndex((i) => Math.min(comments.length - 1, i + 1));
				} else if (focusArea === "description") {
					setFocusArea("comments");
				}
			},
			onNew: () => {
				setInputValue("");
				setModal({ type: "addComment" });
			},
			onEdit: () => {
				if (!task) return;
				if (focusArea === "description") {
					setInputValue(task.description);
					setModal({ type: "editDescription" });
				} else if (focusArea === "fields") {
					setModal({ type: "editStatus" });
				}
			},
			onBack: goBack,
		},
	});

	const handleAddComment = (content: string) => {
		if (content.trim()) {
			addComment(content.trim());
			setCommentIndex(comments.length);
		}
		setModal({ type: "none" });
		setInputValue("");
	};

	const handleEditDescription = (content: string) => {
		if (task) {
			updateTask(task.id, { description: content });
		}
		setModal({ type: "none" });
		setInputValue("");
	};

	const handleStatusChange = (status: TaskStatus) => {
		if (task) {
			updateTask(task.id, { status });
		}
		setModal({ type: "none" });
	};

	const handlePriorityChange = (priority: Priority) => {
		if (task) {
			updateTask(task.id, { priority });
		}
		setModal({ type: "none" });
	};

	if (!board || !task) {
		return (
			<Shell title="Not found" breadcrumbs={["Boards", "???", "???"]}>
				<Text color="red">Task not found</Text>
			</Shell>
		);
	}

	const leftWidth = Math.floor((columns - 6) * 0.65);
	const rightWidth = columns - 6 - leftWidth - 2;
	const contentHeight = rows - 6;
	const descHeight = Math.floor(contentHeight * 0.4);
	const commentHeight = contentHeight - descHeight - 1;

	return (
		<Shell title={task.title} breadcrumbs={["Boards", board.name, task.title]}>
			<Box gap={1}>
				<Box flexDirection="column" width={leftWidth}>
					<Description
						description={task.description}
						useNerdfonts={settings.ui.useNerdfonts}
						maxHeight={descHeight}
					/>
					<Box marginTop={1}>
						<CommentList
							comments={comments}
							selectedIndex={focusArea === "comments" ? commentIndex : -1}
							useNerdfonts={settings.ui.useNerdfonts}
							maxHeight={commentHeight}
						/>
					</Box>
				</Box>
				<Box
					width={rightWidth}
					borderStyle="single"
					borderLeft
					borderRight={false}
					borderTop={false}
					borderBottom={false}
					borderColor={focusArea === "fields" ? "cyan" : "gray"}
					paddingLeft={1}
				>
					<Fields
						status={task.status}
						priority={task.priority}
						dueDate={task.due_date}
						tags={task.tags}
						createdAt={task.created_at}
						updatedAt={task.updated_at}
						useNerdfonts={settings.ui.useNerdfonts}
					/>
				</Box>
			</Box>

			{modal.type === "addComment" && (
				<Modal title="Add Comment">
					<Input
						label="Comment"
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleAddComment}
						onCancel={() => setModal({ type: "none" })}
						placeholder="Write a comment..."
					/>
					<Box marginTop={1}>
						<Text dimColor>Enter to add • Esc to cancel</Text>
					</Box>
				</Modal>
			)}

			{modal.type === "editDescription" && (
				<Modal title="Edit Description" width={60}>
					<Input
						label="Description"
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleEditDescription}
						onCancel={() => setModal({ type: "none" })}
					/>
					<Box marginTop={1}>
						<Text dimColor>Enter to save • Esc to cancel</Text>
					</Box>
				</Modal>
			)}

			{modal.type === "editStatus" && (
				<StatusPicker
					current={task.status}
					onSelect={handleStatusChange}
					onCancel={() => setModal({ type: "none" })}
					onSwitchToPriority={() => setModal({ type: "editPriority" })}
				/>
			)}

			{modal.type === "editPriority" && (
				<PriorityPicker
					current={task.priority}
					onSelect={handlePriorityChange}
					onCancel={() => setModal({ type: "none" })}
					onSwitchToStatus={() => setModal({ type: "editStatus" })}
				/>
			)}
		</Shell>
	);
}

interface StatusPickerProps {
	current: TaskStatus;
	onSelect: (status: TaskStatus) => void;
	onCancel: () => void;
	onSwitchToPriority: () => void;
}

function StatusPicker({
	current,
	onSelect,
	onCancel,
	onSwitchToPriority,
}: StatusPickerProps) {
	const [selected, setSelected] = useState(statuses.indexOf(current));

	useKeymap({
		handlers: {
			onLeft: () => setSelected((s) => Math.max(0, s - 1)),
			onRight: () => setSelected((s) => Math.min(statuses.length - 1, s + 1)),
			onDown: onSwitchToPriority,
			onSelect: () => {
				const status = statuses[selected];
				if (status) onSelect(status);
			},
			onBack: onCancel,
		},
	});

	return (
		<Modal title="Change Status">
			<Box gap={2}>
				{statuses.map((status, i) => (
					<Text
						key={status}
						inverse={selected === i}
						color={selected === i ? "cyan" : undefined}
					>
						{" "}
						{status.toUpperCase()}{" "}
					</Text>
				))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					←/→ select • ↓ priority • Enter confirm • Esc cancel
				</Text>
			</Box>
		</Modal>
	);
}

interface PriorityPickerProps {
	current: Priority;
	onSelect: (priority: Priority) => void;
	onCancel: () => void;
	onSwitchToStatus: () => void;
}

function PriorityPicker({
	current,
	onSelect,
	onCancel,
	onSwitchToStatus,
}: PriorityPickerProps) {
	const [selected, setSelected] = useState(priorities.indexOf(current));

	useKeymap({
		handlers: {
			onLeft: () => setSelected((s) => Math.max(0, s - 1)),
			onRight: () => setSelected((s) => Math.min(priorities.length - 1, s + 1)),
			onUp: onSwitchToStatus,
			onSelect: () => {
				const priority = priorities[selected];
				if (priority) onSelect(priority);
			},
			onBack: onCancel,
		},
	});

	const priorityColors: Record<Priority, string> = {
		low: "gray",
		medium: "white",
		high: "yellow",
		urgent: "red",
	};

	return (
		<Modal title="Change Priority">
			<Box gap={2}>
				{priorities.map((p, i) => (
					<Text
						key={p}
						inverse={selected === i}
						color={selected === i ? priorityColors[p] : undefined}
					>
						{" "}
						{p.toUpperCase()}{" "}
					</Text>
				))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>←/→ select • ↑ status • Enter confirm • Esc cancel</Text>
			</Box>
		</Modal>
	);
}
