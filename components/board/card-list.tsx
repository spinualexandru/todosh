import type { TaskWithTags } from "@types";
import { Box, Text } from "ink";
import { Card } from "./card";

interface CardListProps {
	tasks: TaskWithTags[];
	selectedIndex: number;
	isFocused: boolean;
	useNerdfonts: boolean;
	width: number;
	maxHeight: number;
}

export function CardList({
	tasks,
	selectedIndex,
	isFocused,
	useNerdfonts,
	width,
	maxHeight,
}: CardListProps) {
	if (tasks.length === 0) {
		return (
			<Box justifyContent="center" paddingY={1}>
				<Text dimColor>No tasks</Text>
			</Box>
		);
	}

	const cardHeight = 3;
	const visibleCards = Math.floor(maxHeight / cardHeight);
	const halfVisible = Math.floor(visibleCards / 2);

	let startIndex = Math.max(0, selectedIndex - halfVisible);
	const endIndex = Math.min(tasks.length, startIndex + visibleCards);

	if (endIndex - startIndex < visibleCards) {
		startIndex = Math.max(0, endIndex - visibleCards);
	}

	const visibleTasks = tasks.slice(startIndex, endIndex);
	const hasMore = endIndex < tasks.length;
	const hasPrev = startIndex > 0;

	return (
		<Box flexDirection="column" height={maxHeight}>
			{hasPrev && (
				<Box justifyContent="center">
					<Text dimColor>↑ {startIndex} more</Text>
				</Box>
			)}
			{visibleTasks.map((task, i) => (
				<Card
					key={task.id}
					task={task}
					isSelected={startIndex + i === selectedIndex}
					isFocused={isFocused}
					useNerdfonts={useNerdfonts}
					width={width - 2}
				/>
			))}
			{hasMore && (
				<Box justifyContent="center">
					<Text dimColor>↓ {tasks.length - endIndex} more</Text>
				</Box>
			)}
		</Box>
	);
}
