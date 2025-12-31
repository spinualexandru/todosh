import { Confirm, Input, Modal } from "@components/common";
import { Shell } from "@components/layout";
import { useBoards, useKeymap, useRouter, useSettings } from "@hooks";
import type { BoardWithStats } from "@types";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";
import { useState } from "react";

type ModalState =
	| { type: "none" }
	| { type: "create" }
	| { type: "edit"; board: BoardWithStats }
	| { type: "delete"; board: BoardWithStats };

export function DashboardView() {
	const { boards, isLoading, createBoard, updateBoard, deleteBoard } =
		useBoards();
	const { navigate } = useRouter();
	const { settings } = useSettings();
	const icons = settings.ui.useNerdfonts ? glyphs : fallbackGlyphs;

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [modal, setModal] = useState<ModalState>({ type: "none" });
	const [inputValue, setInputValue] = useState("");

	const isModalOpen = modal.type !== "none";

	useKeymap({
		isActive: !isModalOpen,
		handlers: {
			onUp: () => setSelectedIndex((i) => Math.max(0, i - 1)),
			onDown: () => setSelectedIndex((i) => Math.min(boards.length - 1, i + 1)),
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

	if (isLoading) {
		return (
			<Shell title="Dashboard" breadcrumbs={["Boards"]}>
				<Text>Loading boards...</Text>
			</Shell>
		);
	}

	return (
		<Shell title="Dashboard" breadcrumbs={["Boards"]}>
			{boards.length === 0 ? (
				<Box flexDirection="column" alignItems="center" marginTop={2}>
					<Text color="gray">{icons.board} No boards yet</Text>
					<Text dimColor>Press n to create your first board</Text>
				</Box>
			) : (
				<Box flexDirection="column" gap={0}>
					{boards.map((board, index) => (
						<BoardItem
							key={board.id}
							board={board}
							isSelected={index === selectedIndex}
							icons={icons}
						/>
					))}
				</Box>
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
					<Box marginTop={1}>
						<Text dimColor>Enter to create • Esc to cancel</Text>
					</Box>
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
					<Box marginTop={1}>
						<Text dimColor>Enter to save • Esc to cancel</Text>
					</Box>
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
		</Shell>
	);
}

interface BoardItemProps {
	board: BoardWithStats;
	isSelected: boolean;
	icons: typeof glyphs;
}

function BoardItem({ board, isSelected, icons }: BoardItemProps) {
	return (
		<Box paddingX={1}>
			<Text inverse={isSelected} color={isSelected ? "cyan" : undefined}>
				{" "}
				{icons.board} {board.name}{" "}
			</Text>
			<Box marginLeft={1} gap={2}>
				<Text dimColor>
					{icons.column.todo} {board.todoCount ?? 0}
				</Text>
				<Text dimColor>
					{icons.column.doing} {board.doingCount ?? 0}
				</Text>
				<Text dimColor>
					{icons.column.done} {board.doneCount ?? 0}
				</Text>
			</Box>
		</Box>
	);
}
