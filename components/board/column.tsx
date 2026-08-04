import { Text } from "@components/common";
import type { TaskStatus, TaskWithTags } from "@types";
import { BOLD, DIM, fallbackGlyphs, glyphs, inkColor } from "@utils";
import { CardList } from "./card-list";

interface ColumnProps {
	status: TaskStatus;
	tasks: TaskWithTags[];
	selectedIndex: number;
	isFocused: boolean;
	useNerdfonts: boolean;
	width: number;
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

export function Column({
	status,
	tasks,
	selectedIndex,
	isFocused,
	useNerdfonts,
	width,
}: ColumnProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const icon = icons.column[status];
	const color = statusColors[status];
	const label = statusLabels[status];

	return (
		// No explicit height: the row container stretches every column to the
		// space left over after the search bar and filter menu.
		<box
			flexDirection="column"
			width={width}
			border
			borderStyle="double"
			borderColor={inkColor(isFocused ? "lightCyan" : "gray")}
		>
			<box
				flexDirection="row"
				paddingX={1}
				border={["bottom"]}
				borderStyle="single"
				borderColor={inkColor("gray")}
			>
				<Text fg={inkColor(color)} attributes={BOLD}>
					{icon} {label}
				</Text>
				<box flexGrow={1} />
				<Text attributes={DIM}>{tasks.length}</Text>
			</box>
			<box flexGrow={1} paddingX={1} flexDirection="column">
				<CardList
					tasks={tasks.sort(
						(a, b) =>
							new Date(b.updated_at).getTime() -
							new Date(a.updated_at).getTime(),
					)}
					selectedIndex={selectedIndex}
					isFocused={isFocused}
					useNerdfonts={useNerdfonts}
					width={width - 4}
				/>
			</box>
		</box>
	);
}
