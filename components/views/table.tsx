import {
	Confirm,
	EditTaskModal,
	Input,
	Modal,
	type TaskUpdates,
	Text,
} from "@components/common";
import { Shell } from "@components/layout";
import { FilterMenu, SearchBar } from "@components/search";
import { type ColumnConfig, TableHeader, TableRow } from "@components/table";
import {
	KeymapPriority,
	useBoards,
	useFilter,
	useKeymap,
	useRouter,
	useScrollIntoView,
	useSearch,
	useSettings,
	useTerminalSize,
} from "@hooks";
import { useTasks } from "@hooks/useTasks";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { TaskStatus, TaskWithTags } from "@types";
import { attrs, DIM, inkColor, selection } from "@utils";
import { useEffect, useMemo, useRef, useState } from "react";

interface TableViewProps {
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

const tableHints = [
	{ action: "up", label: "↑" },
	{ action: "down", label: "↓" },
	{ action: "select", label: "Open" },
	{ action: "new", label: "New" },
	{ action: "edit", label: "Edit" },
	{ action: "move", label: "Move" },
	{ action: "archive", label: "Archive" },
	{ action: "search", label: "Search" },
	{ action: "toggleView", label: "Board" },
	{ action: "back", label: "Back" },
];

export function TableView({ boardId }: TableViewProps) {
	const { columns: termCols } = useTerminalSize();
	const { getBoard } = useBoards();
	const {
		tasks,
		isLoading,
		createTask,
		updateTask,
		deleteTask,
		moveTask,
		archiveTask,
		setTaskTags,
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

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [modal, setModal] = useState<ModalState>({ type: "none" });
	const [inputValue, setInputValue] = useState("");

	useEffect(() => {
		if (selectedIndex >= filteredTasks.length && filteredTasks.length > 0) {
			setSelectedIndex(filteredTasks.length - 1);
		}
	}, [filteredTasks.length, selectedIndex]);

	const isModalOpen = modal.type !== "none";
	const isInputActive = isSearching || isFiltering || isModalOpen;
	const selectedTask = filteredTasks[selectedIndex];

	const scrollRef = useRef<ScrollBoxRenderable>(null);
	useScrollIntoView(
		scrollRef,
		selectedTask ? `row-${selectedTask.id}` : undefined,
	);

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
		isActive: !isInputActive,
		handlers: {
			onUp: () => setSelectedIndex((i) => Math.max(0, i - 1)),
			onDown: () =>
				setSelectedIndex((i) =>
					Math.min(Math.max(0, filteredTasks.length - 1), i + 1),
				),
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

	const handleEditSubmit = (updates: TaskUpdates) => {
		if (modal.type === "edit") {
			const { tags, ...taskUpdates } = updates;
			if (Object.keys(taskUpdates).length > 0) {
				updateTask(modal.task.id, taskUpdates);
			}
			if (tags) {
				setTaskTags(modal.task.id, tags);
			}
		}
		setModal({ type: "none" });
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

	const handleArchiveConfirm = () => {
		if (modal.type === "archive") {
			archiveTask(modal.task.id);
			setSelectedIndex((i) => Math.max(0, i - 1));
		}
		setModal({ type: "none" });
	};

	if (!board) {
		return (
			<Shell
				title="Board not found"
				breadcrumbs={["Boards", "???"]}
				hints={tableHints}
			>
				<Text fg={inkColor("red")}>Board not found</Text>
			</Shell>
		);
	}

	if (isLoading) {
		return (
			<Shell
				title={board.name}
				breadcrumbs={["Boards", board.name, "Table"]}
				hints={tableHints}
			>
				<Text>Loading tasks...</Text>
			</Shell>
		);
	}

	return (
		<Shell
			title={`${board.name} (Table)`}
			breadcrumbs={["Boards", board.name, "Table"]}
			hints={tableHints}
		>
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
				<box flexDirection="row" marginBottom={1} gap={2}>
					{query && <Text attributes={DIM}>Search: "{query}"</Text>}
					{hasActiveFilters && (
						<Text attributes={DIM}>Filters active (Esc to clear)</Text>
					)}
				</box>
			)}

			{filteredTasks.length === 0 ? (
				<box flexDirection="column" alignItems="center" marginTop={2}>
					{tasks.length === 0 ? (
						<>
							<Text attributes={DIM}>No tasks yet</Text>
							<Text attributes={DIM}>Press n to create your first task</Text>
						</>
					) : (
						<Text attributes={DIM}>No tasks match current filters</Text>
					)}
				</box>
			) : (
				<box flexDirection="column" flexGrow={1} flexBasis={0}>
					<TableHeader
						useNerdfonts={settings.ui.useNerdfonts}
						columns={tableColumns}
					/>
					<scrollbox
						ref={scrollRef}
						flexGrow={1}
						flexBasis={0}
						scrollbarOptions={{
							trackOptions: { foregroundColor: inkColor("gray") },
						}}
					>
						{filteredTasks.map((task, i) => (
							<TableRow
								key={task.id}
								id={`row-${task.id}`}
								task={task}
								isSelected={i === selectedIndex}
								useNerdfonts={settings.ui.useNerdfonts}
								columns={tableColumns}
							/>
						))}
					</scrollbox>
				</box>
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
					<box marginTop={1}>
						<Text attributes={DIM}>Enter to create • Esc to cancel</Text>
					</box>
				</Modal>
			)}

			{modal.type === "edit" && (
				<EditTaskModal
					task={modal.task}
					onSave={handleEditSubmit}
					onCancel={() => setModal({ type: "none" })}
				/>
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
		priority: KeymapPriority.overlay,
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
			<box flexDirection="row" marginTop={1} gap={2}>
				{statuses.map((status, i) => (
					<box key={status} flexDirection="row">
						<Text
							attributes={attrs({ dim: status === task.status })}
							fg={status === task.status ? inkColor("gray") : undefined}
							{...selection(selected === i, "cyan")}
						>
							{" "}
							{status.toUpperCase()}{" "}
						</Text>
					</box>
				))}
			</box>
			<box marginTop={1}>
				<Text attributes={DIM}>
					←/→ to select • Enter to move • Esc to cancel
				</Text>
			</box>
		</Modal>
	);
}
