import { Text } from "@components/common";
import { BOLD, DIM, fallbackGlyphs, glyphs, inkColor } from "@utils";

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
		<box
			flexDirection="row"
			border={["bottom"]}
			borderStyle="single"
			borderColor={inkColor("gray")}
			paddingX={1}
		>
			{columns.map((col, i) => (
				<box key={col.key} flexDirection="row" width={col.width}>
					<box flexDirection="row" flexGrow={1}>
						<Text attributes={BOLD} fg={inkColor("cyan")}>
							{col.label}
						</Text>
					</box>
					{i < columns.length - 1 && (
						<Text attributes={DIM}>{icons.border.vertical}</Text>
					)}
				</box>
			))}
		</box>
	);
}
