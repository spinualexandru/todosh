import { Text } from "@components/common";
import { BOLD, DIM_ITALIC, fallbackGlyphs, glyphs, inkColor } from "@utils";

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
					{icons.task} Description
				</Text>
			</box>
			{description ? (
				<scrollbox
					flexGrow={1}
					flexBasis={0}
					scrollbarOptions={{
						trackOptions: { foregroundColor: inkColor("gray") },
					}}
				>
					<Text wrapMode="word">{description}</Text>
				</scrollbox>
			) : (
				<box flexGrow={1}>
					<Text attributes={DIM_ITALIC}>No description</Text>
				</box>
			)}
		</box>
	);
}
