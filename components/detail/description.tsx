import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";

interface DescriptionProps {
	description: string;
	useNerdfonts: boolean;
	maxHeight: number;
}

export function Description({
	description,
	useNerdfonts,
	maxHeight,
}: DescriptionProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;

	const lines = description ? description.split("\n") : [];
	const displayLines = lines.slice(0, maxHeight - 2);
	const hasMore = lines.length > maxHeight - 2;

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
					{icons.task} Description
				</Text>
			</Box>
			{description ? (
				<Box flexDirection="column" flexGrow={1}>
					{displayLines.map((line, i) => (
						<Text key={`${i}-${line.slice(0, 20)}`}>{line || " "}</Text>
					))}
					{hasMore && (
						<Text dimColor>
							... ({lines.length - displayLines.length} more lines)
						</Text>
					)}
				</Box>
			) : (
				<Box flexGrow={1}>
					<Text dimColor italic>
						No description
					</Text>
				</Box>
			)}
		</Box>
	);
}
