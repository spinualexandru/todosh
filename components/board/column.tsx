import type { TaskStatus, TaskWithTags } from "@types";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";
import { CardList } from "./card-list";

interface ColumnProps {
	status: TaskStatus;
	tasks: TaskWithTags[];
	selectedIndex: number;
	isFocused: boolean;
	useNerdfonts: boolean;
	width: number;
	height: number;
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
	height,
}: ColumnProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const icon = icons.column[status];
	const color = statusColors[status];
	const label = statusLabels[status];

	return (
		<Box
			flexDirection="column"
			width={width}
			height={height}
			borderStyle="single"
			borderColor={isFocused ? "cyan" : "gray"}
		>
			<Box
				paddingX={1}
				borderStyle="single"
				borderBottom
				borderTop={false}
				borderLeft={false}
				borderRight={false}
				borderColor="gray"
			>
				<Text color={color as never} bold>
					{icon} {label}
				</Text>
				<Box flexGrow={1} />
				<Text dimColor>{tasks.length}</Text>
			</Box>
			<Box flexGrow={1} paddingX={1} flexDirection="column">
				<CardList
					tasks={tasks}
					selectedIndex={selectedIndex}
					isFocused={isFocused}
					useNerdfonts={useNerdfonts}
					width={width - 4}
					maxHeight={height - 4}
				/>
			</Box>
		</Box>
	);
}
