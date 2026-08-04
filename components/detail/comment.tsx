import { Text } from "@components/common";
import { useScrollIntoView } from "@hooks";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { Comment as CommentType } from "@types";
import {
	BOLD,
	DIM,
	DIM_ITALIC,
	fallbackGlyphs,
	glyphs,
	inkColor,
} from "@utils";
import { useRef } from "react";

interface CommentProps {
	comment: CommentType;
	isSelected: boolean;
	useNerdfonts: boolean;
	/** Stable id so the parent scrollbox can scroll this comment into view. */
	id?: string;
}

export function Comment({
	comment,
	isSelected,
	useNerdfonts,
	id,
}: CommentProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;

	return (
		<box
			id={id}
			flexDirection="column"
			border
			borderStyle={isSelected ? "rounded" : "single"}
			borderColor={inkColor(isSelected ? "cyan" : "gray")}
			paddingX={1}
			marginBottom={1}
		>
			<box flexDirection="row">
				<Text attributes={DIM}>
					{icons.comment} {formatDateTime(comment.created_at)}
				</Text>
			</box>
			<Text>{comment.content}</Text>
		</box>
	);
}

interface CommentListProps {
	comments: CommentType[];
	selectedIndex: number;
	useNerdfonts: boolean;
	maxHeight: number;
}

export function CommentList({
	comments,
	selectedIndex,
	useNerdfonts,
	maxHeight,
}: CommentListProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const scrollRef = useRef<ScrollBoxRenderable>(null);
	const selectedId = comments[selectedIndex]?.id;
	useScrollIntoView(
		scrollRef,
		selectedId ? `comment-${selectedId}` : undefined,
	);

	if (comments.length === 0) {
		return (
			<box flexDirection="column">
				<box
					flexDirection="row"
					border={["bottom"]}
					borderStyle="single"
					borderColor={inkColor("gray")}
					marginBottom={1}
				>
					<Text attributes={BOLD} fg={inkColor("cyan")}>
						{icons.comment} Comments
					</Text>
				</box>
				<Text attributes={DIM_ITALIC}>No comments yet</Text>
			</box>
		);
	}

	return (
		<box flexDirection="column" height={maxHeight}>
			<box
				flexDirection="row"
				border={["bottom"]}
				borderStyle="single"
				borderColor={inkColor("gray")}
				marginBottom={1}
			>
				<Text attributes={BOLD} fg={inkColor("cyan")}>
					{icons.comment} Comments ({comments.length})
				</Text>
			</box>
			<scrollbox
				ref={scrollRef}
				flexGrow={1}
				flexBasis={0}
				scrollbarOptions={{
					trackOptions: { foregroundColor: inkColor("gray") },
				}}
			>
				{comments.map((comment, i) => (
					<Comment
						key={comment.id}
						id={`comment-${comment.id}`}
						comment={comment}
						isSelected={i === selectedIndex}
						useNerdfonts={useNerdfonts}
					/>
				))}
			</scrollbox>
		</box>
	);
}

function formatDateTime(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
