import { Confirm, Input, Modal } from "@components/common";
import { Shell } from "@components/layout";
import { type ColumnConfig, TableHeader, TableRow } from "@components/table";
import {
	getTerminalSize,
	useBoards,
	useKeymap,
	useRouter,
	useSettings,
} from "@hooks";
import { useTasks } from "@hooks/useTasks";
import type { TaskStatus, TaskWithTags } from "@types";
import { Box, Text, useStdout } from "ink";
import { useMemo, useState } from "react";

interface TableViewProps {
	boardId: number;
}

type ModalState =
	| { type: "none" }
	| { type: "create" }
	| { type: "edit"; task: TaskWithTags }
	| { type: "delete"; task: TaskWithTags }
	| { type: "move"; task: TaskWithTags };

const statuses: TaskStatus[] = ["todo", "doing", "done"];

export function TableView({ boardId }: TableViewProps) {
	const { stdout } = useStdout();
	const { columns: termCols, rows } = getTerminalSize(stdout);
	const { getBoard } = useBoards();
	const { tasks, isLoading, createTask, updateTask, deleteTask, moveTask } =
		useTasks(boardId);
	const { navigate, goBack } = useRouter();
	const { settings } = useSettings();

	const board = getBoard(boardId);

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [modal, setModal] = useState<ModalState>({ type: "none" });
	const [inputValue, setInputValue] = useState("");

	const isModalOpen = modal.type !== "none";
	const selectedTask = tasks[selectedIndex];

	const tableColumns: ColumnConfig[] = useMemo(() => {
		const availableWidth = termCols - 6;
		return [
			{ key: "title", label: "Title", width: Math.floor(availableWidth * 0.4) },
			{ key: "status", label: "Status", width: 14 },
			{ key: "priority", label: "Priority", width: 14 },
			{ key: "due_date", label: "Due", width: 12 },
			{ key: "tags", label: "Tags", width: Math.floor(availableWidth * 0.2) },
		];
	}, [termCols]);

	useKeymap({
		isActive: !isModalOpen,
		handlers: {
			onUp: () => setSelectedIndex((i) => Math.max(0, i - 1)),
			onDown: () => setSelectedIndex((i) => Math.min(tasks.length - 1, i + 1)),
			onSelect: () => {
				if (selectedTask) {
					navigate({
						view: "detail",
						boardId,
						taskId: selectedTask.id,
					});
				}
			},
			onNew: () => {
				setInputValue("");
				setModal({ type: "create" });
			},
			onEdit: () => {
				if (selectedTask) {
					setInputValue(selectedTask.title);
					setModal({ type: "edit", task: selectedTask });
				}
			},
			onDelete: () => {
				if (selectedTask) {
					setModal({ type: "delete", task: selectedTask });
				}
			},
			onMove: () => {
				if (selectedTask) {
					setModal({ type: "move", task: selectedTask });
				}
			},
			onBack: () => goBack(),
			onToggleView: () => navigate({ view: "board", boardId }),
		},
	});

	const handleCreateSubmit = (title: string) => {
		if (title.trim()) {
			createTask({
				board_id: boardId,
				title: title.trim(),
				status: "todo",
			});
		}
		setModal({ type: "none" });
		setInputValue("");
	};

	const handleEditSubmit = (title: string) => {
		if (modal.type === "edit" && title.trim()) {
			updateTask(modal.task.id, { title: title.trim() });
		}
		setModal({ type: "none" });
		setInputValue("");
	};

	const handleDeleteConfirm = () => {
		if (modal.type === "delete") {
			deleteTask(modal.task.id);
			setSelectedIndex((i) => Math.max(0, i - 1));
		}
		setModal({ type: "none" });
	};

	const handleMoveToStatus = (newStatus: TaskStatus) => {
		if (modal.type === "move") {
			moveTask(modal.task.id, newStatus);
		}
		setModal({ type: "none" });
	};

	if (!board) {
		return (
			<Shell title="Board not found" breadcrumbs={["Boards", "???"]}>
				<Text color="red">Board not found</Text>
			</Shell>
		);
	}

	if (isLoading) {
		return (
			<Shell title={board.name} breadcrumbs={["Boards", board.name, "Table"]}>
				<Text>Loading tasks...</Text>
			</Shell>
		);
	}

	const maxVisibleRows = rows - 8;
	const halfVisible = Math.floor(maxVisibleRows / 2);
	let startIndex = Math.max(0, selectedIndex - halfVisible);
	const endIndex = Math.min(tasks.length, startIndex + maxVisibleRows);
	if (endIndex - startIndex < maxVisibleRows) {
		startIndex = Math.max(0, endIndex - maxVisibleRows);
	}
	const visibleTasks = tasks.slice(startIndex, endIndex);

	return (
		<Shell
			title={`${board.name} (Table)`}
			breadcrumbs={["Boards", board.name, "Table"]}
		>
			{tasks.length === 0 ? (
				<Box flexDirection="column" alignItems="center" marginTop={2}>
					<Text dimColor>No tasks yet</Text>
					<Text dimColor>Press n to create your first task</Text>
				</Box>
			) : (
				<Box flexDirection="column">
					<TableHeader
						useNerdfonts={settings.ui.useNerdfonts}
						columns={tableColumns}
					/>
					{startIndex > 0 && (
						<Box paddingX={1}>
							<Text dimColor>↑ {startIndex} more</Text>
						</Box>
					)}
					{visibleTasks.map((task, i) => (
						<TableRow
							key={task.id}
							task={task}
							isSelected={startIndex + i === selectedIndex}
							useNerdfonts={settings.ui.useNerdfonts}
							columns={tableColumns}
						/>
					))}
					{endIndex < tasks.length && (
						<Box paddingX={1}>
							<Text dimColor>↓ {tasks.length - endIndex} more</Text>
						</Box>
					)}
				</Box>
			)}

			{modal.type === "create" && (
				<Modal title="New Task">
					<Input
						label="Title"
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleCreateSubmit}
						onCancel={() => setModal({ type: "none" })}
						placeholder="Enter task title..."
					/>
					<Box marginTop={1}>
						<Text dimColor>Enter to create • Esc to cancel</Text>
					</Box>
				</Modal>
			)}

			{modal.type === "edit" && (
				<Modal title="Edit Task">
					<Input
						label="Title"
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleEditSubmit}
						onCancel={() => setModal({ type: "none" })}
					/>
					<Box marginTop={1}>
						<Text dimColor>Enter to save • Esc to cancel</Text>
					</Box>
				</Modal>
			)}

			{modal.type === "delete" && (
				<Confirm
					title="Delete Task"
					message={`Delete "${modal.task.title}"?`}
					onConfirm={handleDeleteConfirm}
					onCancel={() => setModal({ type: "none" })}
					confirmLabel="Delete"
					dangerous
				/>
			)}

			{modal.type === "move" && (
				<MoveModal
					task={modal.task}
					onMove={handleMoveToStatus}
					onCancel={() => setModal({ type: "none" })}
				/>
			)}
		</Shell>
	);
}

interface MoveModalProps {
	task: TaskWithTags;
	onMove: (status: TaskStatus) => void;
	onCancel: () => void;
}

function MoveModal({ task, onMove, onCancel }: MoveModalProps) {
	const [selected, setSelected] = useState<number>(
		statuses.indexOf(task.status),
	);

	useKeymap({
		handlers: {
			onLeft: () => setSelected((s) => Math.max(0, s - 1)),
			onRight: () => setSelected((s) => Math.min(2, s + 1)),
			onSelect: () => {
				const newStatus = statuses[selected];
				if (newStatus && newStatus !== task.status) {
					onMove(newStatus);
				} else {
					onCancel();
				}
			},
			onBack: onCancel,
		},
	});

	return (
		<Modal title="Move Task">
			<Text>Move "{task.title}" to:</Text>
			<Box marginTop={1} gap={2}>
				{statuses.map((status, i) => (
					<Box key={status}>
						<Text
							inverse={selected === i}
							color={
								status === task.status
									? "gray"
									: selected === i
										? "cyan"
										: undefined
							}
							dimColor={status === task.status}
						>
							{" "}
							{status.toUpperCase()}{" "}
						</Text>
					</Box>
				))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>←/→ to select • Enter to move • Esc to cancel</Text>
			</Box>
		</Modal>
	);
}
