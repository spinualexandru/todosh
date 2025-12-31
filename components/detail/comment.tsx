import type { Comment as CommentType } from "@types";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";

interface CommentProps {
	comment: CommentType;
	isSelected: boolean;
	useNerdfonts: boolean;
}

export function Comment({ comment, isSelected, useNerdfonts }: CommentProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;

	return (
		<Box
			flexDirection="column"
			borderStyle={isSelected ? "round" : "single"}
			borderColor={isSelected ? "cyan" : "gray"}
			paddingX={1}
			marginBottom={1}
		>
			<Box>
				<Text dimColor>
					{icons.comment} {formatDateTime(comment.created_at)}
				</Text>
			</Box>
			<Text>{comment.content}</Text>
		</Box>
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

	if (comments.length === 0) {
		return (
			<Box flexDirection="column">
				<Box
					borderStyle="single"
					borderBottom
					borderTop={false}
					borderLeft={false}
					borderRight={false}
					borderColor="gray"
					marginBottom={1}
				>
					<Text bold color="cyan">
						{icons.comment} Comments
					</Text>
				</Box>
				<Text dimColor italic>
					No comments yet
				</Text>
			</Box>
		);
	}

	const commentHeight = 4;
	const visibleCount = Math.max(1, Math.floor((maxHeight - 2) / commentHeight));
	const halfVisible = Math.floor(visibleCount / 2);

	let startIndex = Math.max(0, selectedIndex - halfVisible);
	const endIndex = Math.min(comments.length, startIndex + visibleCount);
	if (endIndex - startIndex < visibleCount) {
		startIndex = Math.max(0, endIndex - visibleCount);
	}

	const visibleComments = comments.slice(startIndex, endIndex);

	return (
		<Box flexDirection="column" height={maxHeight}>
			<Box
				borderStyle="single"
				borderBottom
				borderTop={false}
				borderLeft={false}
				borderRight={false}
				borderColor="gray"
				marginBottom={1}
			>
				<Text bold color="cyan">
					{icons.comment} Comments ({comments.length})
				</Text>
			</Box>
			{startIndex > 0 && <Text dimColor>↑ {startIndex} more</Text>}
			{visibleComments.map((comment, i) => (
				<Comment
					key={comment.id}
					comment={comment}
					isSelected={startIndex + i === selectedIndex}
					useNerdfonts={useNerdfonts}
				/>
			))}
			{endIndex < comments.length && (
				<Text dimColor>↓ {comments.length - endIndex} more</Text>
			)}
		</Box>
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
