import { Column } from "@components/board";
import { Confirm, Input, Modal } from "@components/common";
import { Shell } from "@components/layout";
import { FilterMenu, SearchBar } from "@components/search";
import {
	getTerminalSize,
	useBoards,
	useFilter,
	useKeymap,
	useRouter,
	useSearch,
	useSettings,
} from "@hooks";
import { useTasks } from "@hooks/useTasks";
import type { TaskStatus, TaskWithTags } from "@types";
import { Box, Text, useStdout } from "ink";
import { useEffect, useMemo, useState } from "react";

interface BoardViewProps {
	boardId: number;
}

type ModalState =
	| { type: "none" }
	| { type: "create" }
	| { type: "edit"; task: TaskWithTags }
	| { type: "delete"; task: TaskWithTags }
	| { type: "move"; task: TaskWithTags }
	| { type: "archive"; task: TaskWithTags };

const statuses: TaskStatus[] = ["todo", "doing", "done"];

export function BoardView({ boardId }: BoardViewProps) {
	const { stdout } = useStdout();
	const { rows } = getTerminalSize(stdout);
	const { getBoard } = useBoards();
	const {
		tasks,
		isLoading,
		createTask,
		updateTask,
		deleteTask,
		moveTask,
		archiveTask,
	} = useTasks(boardId);
	const { navigate, goBack } = useRouter();
	const { settings } = useSettings();

	const {
		query,
		setQuery,
		results: searchResults,
		isSearching,
		openSearch,
		closeSearch,
		resultCount,
	} = useSearch(tasks);

	const {
		filter,
		filteredTasks,
		setStatusFilter,
		setPriorityFilter,
		clearFilters,
		isFiltering,
		closeFilter,
		hasActiveFilters,
	} = useFilter(searchResults);

	const board = getBoard(boardId);

	const [focusedColumn, setFocusedColumn] = useState<number>(0);
	const [selectedIndices, setSelectedIndices] = useState<
		Record<TaskStatus, number>
	>({
		todo: 0,
		doing: 0,
		done: 0,
	});
	const [modal, setModal] = useState<ModalState>({ type: "none" });
	const [inputValue, setInputValue] = useState("");

	const tasksByStatus = useMemo(
		() => ({
			todo: filteredTasks.filter((t) => t.status === "todo"),
			doing: filteredTasks.filter((t) => t.status === "doing"),
			done: filteredTasks.filter((t) => t.status === "done"),
		}),
		[filteredTasks],
	);

	useEffect(() => {
		setSelectedIndices((prev) => ({
			todo: Math.min(prev.todo, Math.max(0, tasksByStatus.todo.length - 1)),
			doing: Math.min(prev.doing, Math.max(0, tasksByStatus.doing.length - 1)),
			done: Math.min(prev.done, Math.max(0, tasksByStatus.done.length - 1)),
		}));
	}, [
		tasksByStatus.todo.length,
		tasksByStatus.doing.length,
		tasksByStatus.done.length,
	]);

	const isModalOpen = modal.type !== "none";
	const isInputActive = isSearching || isFiltering || isModalOpen;
	const currentStatus = statuses[focusedColumn] ?? "todo";
	const currentTasks = tasksByStatus[currentStatus];
	const currentIndex = selectedIndices[currentStatus];
	const selectedTask = currentTasks[currentIndex];

	useKeymap({
		isActive: !isInputActive,
		handlers: {
			onUp: () => {
				setSelectedIndices((prev) => ({
					...prev,
					[currentStatus]: Math.max(0, prev[currentStatus] - 1),
				}));
			},
			onDown: () => {
				setSelectedIndices((prev) => ({
					...prev,
					[currentStatus]: Math.min(
						Math.max(0, currentTasks.length - 1),
						prev[currentStatus] + 1,
					),
				}));
			},
			onLeft: () => {
				setFocusedColumn((prev) => Math.max(0, prev - 1));
			},
			onRight: () => {
				setFocusedColumn((prev) => Math.min(statuses.length - 1, prev + 1));
			},
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
			onArchive: () => {
				if (selectedTask) {
					setModal({ type: "archive", task: selectedTask });
				}
			},
			onSearch: openSearch,
			onBack: () => {
				if (hasActiveFilters) {
					clearFilters();
				} else {
					goBack();
				}
			},
			onToggleView: () => {
				navigate({ view: "table", boardId });
			},
		},
	});

	const handleCreateSubmit = (title: string) => {
		if (title.trim()) {
			createTask({
				board_id: boardId,
				title: title.trim(),
				status: currentStatus,
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
			setSelectedIndices((prev) => ({
				...prev,
				[modal.task.status]: Math.max(0, prev[modal.task.status] - 1),
			}));
		}
		setModal({ type: "none" });
	};

	const handleMoveToStatus = (newStatus: TaskStatus) => {
		if (modal.type === "move") {
			moveTask(modal.task.id, newStatus);
		}
		setModal({ type: "none" });
	};

	const handleArchiveConfirm = () => {
		if (modal.type === "archive") {
			archiveTask(modal.task.id);
			setSelectedIndices((prev) => ({
				...prev,
				[modal.task.status]: Math.max(0, prev[modal.task.status] - 1),
			}));
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
			<Shell title={board.name} breadcrumbs={["Boards", board.name]}>
				<Text>Loading tasks...</Text>
			</Shell>
		);
	}

	const searchBarHeight = isSearching ? 3 : 0;
	const filterMenuHeight = isFiltering ? 5 : 0;
	const columnHeight = rows - 6 - searchBarHeight - filterMenuHeight;
	const columnWidth = Math.floor((80 - 6) / 3);

	return (
		<Shell title={board.name} breadcrumbs={["Boards", board.name]}>
			{isSearching && (
				<SearchBar
					value={query}
					onChange={setQuery}
					onClose={closeSearch}
					resultCount={resultCount}
					useNerdfonts={settings.ui.useNerdfonts}
				/>
			)}

			{isFiltering && (
				<FilterMenu
					filter={filter}
					onStatusChange={setStatusFilter}
					onPriorityChange={setPriorityFilter}
					onClear={clearFilters}
					onClose={closeFilter}
					useNerdfonts={settings.ui.useNerdfonts}
				/>
			)}

			{!isSearching && !isFiltering && (query || hasActiveFilters) && (
				<Box marginBottom={1} gap={2}>
					{query && <Text dimColor>Search: "{query}"</Text>}
					{hasActiveFilters && (
						<Text dimColor>Filters active (Esc to clear)</Text>
					)}
				</Box>
			)}

			<Box gap={1}>
				{statuses.map((status, columnIndex) => (
					<Column
						key={status}
						status={status}
						tasks={tasksByStatus[status]}
						selectedIndex={selectedIndices[status]}
						isFocused={focusedColumn === columnIndex && !isInputActive}
						useNerdfonts={settings.ui.useNerdfonts}
						width={columnWidth}
						height={columnHeight}
					/>
				))}
			</Box>

			{modal.type === "create" && (
				<Modal title={`New Task (${currentStatus.toUpperCase()})`}>
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

			{modal.type === "archive" && (
				<Confirm
					title="Archive Task"
					message={`Archive "${modal.task.title}"?`}
					onConfirm={handleArchiveConfirm}
					onCancel={() => setModal({ type: "none" })}
					confirmLabel="Archive"
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
