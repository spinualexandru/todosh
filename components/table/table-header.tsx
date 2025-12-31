import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";

interface TableHeaderProps {
	useNerdfonts: boolean;
	columns: ColumnConfig[];
}

export interface ColumnConfig {
	key: string;
	label: string;
	width: number;
	align?: "left" | "center" | "right";
}

export function TableHeader({ useNerdfonts, columns }: TableHeaderProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;

	return (
		<Box
			borderStyle="single"
			borderBottom
			borderTop={false}
			borderLeft={false}
			borderRight={false}
			borderColor="gray"
			paddingX={1}
		>
			{columns.map((col, i) => (
				<Box key={col.key} width={col.width}>
					<Text bold color="cyan">
						{col.label}
					</Text>
					{i < columns.length - 1 && (
						<Box marginLeft={1}>
							<Text dimColor>{icons.border.vertical}</Text>
						</Box>
					)}
				</Box>
			))}
		</Box>
	);
}
