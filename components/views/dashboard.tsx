import { Confirm, Input, Modal, Text } from "@components/common";
import { Shell } from "@components/layout";
import { useBoards, useKeymap, useQuit, useRouter, useSettings } from "@hooks";
import type { BoardWithStats } from "@types";
import { DIM, fallbackGlyphs, glyphs, inkColor, selection } from "@utils";
import { useEffect, useState } from "react";

type ModalState =
	| { type: "none" }
	| { type: "create" }
	| { type: "edit"; board: BoardWithStats }
	| { type: "delete"; board: BoardWithStats }
	| { type: "archive"; board: BoardWithStats };

const dashboardHints = [
	{ action: "up", label: "Up" },
	{ action: "down", label: "Down" },
	{ action: "select", label: "Open" },
	{ action: "new", label: "New" },
	{ action: "edit", label: "Edit" },
	{ action: "delete", label: "Delete" },
	{ action: "archive", label: "Archive" },
	{ action: "pin", label: "Pin" },
	{ action: "quit", label: "Quit" },
];

export function DashboardView() {
	const {
		boards,
		isLoading,
		createBoard,
		updateBoard,
		deleteBoard,
		archiveBoard,
	} = useBoards();
	const { navigate } = useRouter();
	const { settings, updateSettings } = useSettings();
	const icons = settings.ui.useNerdfonts ? glyphs : fallbackGlyphs;

	const handleExit = useQuit();

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [modal, setModal] = useState<ModalState>({ type: "none" });
	const [inputValue, setInputValue] = useState("");

	useEffect(() => {
		if (selectedIndex >= boards.length && boards.length > 0) {
			setSelectedIndex(boards.length - 1);
		}
	}, [boards.length, selectedIndex]);

	const isModalOpen = modal.type !== "none";

	useKeymap({
		isActive: !isModalOpen,
		handlers: {
			onUp: () => setSelectedIndex((i) => Math.max(0, i - 1)),
			onDown: () =>
				setSelectedIndex((i) =>
					Math.min(Math.max(0, boards.length - 1), i + 1),
				),
			onSelect: () => {
				const board = boards[selectedIndex];
				if (board) {
					navigate({ view: "board", boardId: board.id });
				}
			},
			onNew: () => {
				setInputValue("");
				setModal({ type: "create" });
			},
			onEdit: () => {
				const board = boards[selectedIndex];
				if (board) {
					setInputValue(board.name);
					setModal({ type: "edit", board });
				}
			},
			onDelete: () => {
				const board = boards[selectedIndex];
				if (board) {
					setModal({ type: "delete", board });
				}
			},
			onArchive: () => {
				const board = boards[selectedIndex];
				if (board) {
					setModal({ type: "archive", board });
				}
			},
			onPin: () => {
				const board = boards[selectedIndex];
				if (board) {
					if (settings.defaultBoard === board.id) {
						updateSettings({ defaultBoard: undefined });
					} else {
						updateSettings({ defaultBoard: board.id });
					}
				}
			},
			onBack: handleExit,
		},
	});

	const handleCreateSubmit = (name: string) => {
		if (name.trim()) {
			createBoard({ name: name.trim() });
		}
		setModal({ type: "none" });
		setInputValue("");
	};

	const handleEditSubmit = (name: string) => {
		if (modal.type === "edit" && name.trim()) {
			updateBoard(modal.board.id, { name: name.trim() });
		}
		setModal({ type: "none" });
		setInputValue("");
	};

	const handleDeleteConfirm = () => {
		if (modal.type === "delete") {
			deleteBoard(modal.board.id);
			setSelectedIndex((i) => Math.max(0, i - 1));
		}
		setModal({ type: "none" });
	};

	const handleArchiveConfirm = () => {
		if (modal.type === "archive") {
			archiveBoard(modal.board.id);
			setSelectedIndex((i) => Math.max(0, i - 1));
		}
		setModal({ type: "none" });
	};

	if (isLoading) {
		return (
			<Shell title="Dashboard" breadcrumbs={["Boards"]} hints={dashboardHints}>
				<Text>Loading boards...</Text>
			</Shell>
		);
	}

	return (
		<Shell title="Dashboard" breadcrumbs={["Boards"]} hints={dashboardHints}>
			{boards.length === 0 ? (
				<box flexDirection="column" alignItems="center" marginTop={2}>
					<Text fg={inkColor("gray")}>{icons.board} No boards yet</Text>
					<Text attributes={DIM}>Press n to create your first board</Text>
				</box>
			) : (
				<box flexDirection="column" gap={0}>
					{boards.map((board, index) => (
						<BoardItem
							key={board.id}
							board={board}
							isSelected={index === selectedIndex}
							isPinned={settings.defaultBoard === board.id}
							icons={icons}
						/>
					))}
				</box>
			)}

			{modal.type === "create" && (
				<Modal title="Create Board">
					<Input
						label="Name"
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleCreateSubmit}
						onCancel={() => setModal({ type: "none" })}
						placeholder="Enter board name..."
					/>
					<box marginTop={1}>
						<Text attributes={DIM}>Enter to create • Esc to cancel</Text>
					</box>
				</Modal>
			)}

			{modal.type === "edit" && (
				<Modal title="Edit Board">
					<Input
						label="Name"
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleEditSubmit}
						onCancel={() => setModal({ type: "none" })}
					/>
					<box marginTop={1}>
						<Text attributes={DIM}>Enter to save • Esc to cancel</Text>
					</box>
				</Modal>
			)}

			{modal.type === "delete" && (
				<Confirm
					title="Delete Board"
					message={`Delete "${modal.board.name}" and all its tasks?`}
					onConfirm={handleDeleteConfirm}
					onCancel={() => setModal({ type: "none" })}
					confirmLabel="Delete"
					dangerous
				/>
			)}

			{modal.type === "archive" && (
				<Confirm
					title="Archive Board"
					message={`Archive "${modal.board.name}"? It can be restored later.`}
					onConfirm={handleArchiveConfirm}
					onCancel={() => setModal({ type: "none" })}
					confirmLabel="Archive"
				/>
			)}
		</Shell>
	);
}

interface BoardItemProps {
	board: BoardWithStats;
	isSelected: boolean;
	isPinned: boolean;
	icons: typeof glyphs;
}

function BoardItem({ board, isSelected, isPinned, icons }: BoardItemProps) {
	return (
		<box flexDirection="row" paddingX={1}>
			<Text {...selection(isSelected, "cyan")}>
				{" "}
				{icons.board} {board.name}{" "}
			</Text>
			{isPinned && <Text fg={inkColor("yellow")}> {icons.pin}</Text>}
			<box flexDirection="row" marginLeft={1} gap={2}>
				<Text attributes={DIM}>
					{icons.column.todo} {board.todoCount ?? 0}
				</Text>
				<Text attributes={DIM}>
					{icons.column.doing} {board.doingCount ?? 0}
				</Text>
				<Text attributes={DIM}>
					{icons.column.done} {board.doneCount ?? 0}
				</Text>
			</box>
		</box>
	);
}
