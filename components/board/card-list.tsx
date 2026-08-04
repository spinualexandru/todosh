import { Text } from "@components/common";
import { useScrollIntoView } from "@hooks";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { TaskWithTags } from "@types";
import { DIM, inkColor } from "@utils";
import { useRef } from "react";
import { Card } from "./card";

interface CardListProps {
	tasks: TaskWithTags[];
	selectedIndex: number;
	isFocused: boolean;
	useNerdfonts: boolean;
	width: number;
}

export function CardList({
	tasks,
	selectedIndex,
	isFocused,
	useNerdfonts,
	width,
}: CardListProps) {
	const scrollRef = useRef<ScrollBoxRenderable>(null);
	const selectedId = tasks[selectedIndex]?.id;
	useScrollIntoView(scrollRef, selectedId ? `card-${selectedId}` : undefined);

	if (tasks.length === 0) {
		return (
			<box flexDirection="row" justifyContent="center" paddingY={1}>
				<Text attributes={DIM}>No tasks</Text>
			</box>
		);
	}

	return (
		<scrollbox
			ref={scrollRef}
			flexGrow={1}
			flexBasis={0}
			scrollbarOptions={{
				trackOptions: { foregroundColor: inkColor("gray") },
			}}
		>
			{tasks.map((task, i) => (
				<Card
					key={task.id}
					id={`card-${task.id}`}
					task={task}
					isSelected={i === selectedIndex}
					isFocused={isFocused}
					useNerdfonts={useNerdfonts}
					width={width - 3}
				/>
			))}
		</scrollbox>
	);
}
