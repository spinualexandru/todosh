import { useSettings } from "@hooks";
import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text } from "ink";

interface HeaderProps {
	title: string;
	breadcrumbs?: string[];
}

export function Header({ title, breadcrumbs = [] }: HeaderProps) {
	const { settings } = useSettings();
	const icons = settings.ui.useNerdfonts ? glyphs : fallbackGlyphs;

	const crumbs = ["Todosh", ...breadcrumbs];

	return (
		<Box
			paddingX={1}
			borderStyle="single"
			borderBottom
			borderTop={false}
			borderLeft={false}
			borderRight={false}
			borderColor="gray"
		>
			<Text bold color="cyan">
				{crumbs.map((crumb, i) => (
					<Text key={`${i}-${crumb}`}>
						{i > 0 && <Text color="gray"> {icons.arrow} </Text>}
						<Text color={i === crumbs.length - 1 ? "white" : "gray"}>
							{crumb}
						</Text>
					</Text>
				))}
			</Text>
			<Box flexGrow={1} />
			<Text dimColor>{title}</Text>
		</Box>
	);
}
