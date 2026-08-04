import { Text } from "@components/common";
import { useSettings } from "@hooks";
import { BOLD, DIM, fallbackGlyphs, glyphs, inkColor } from "@utils";
import { Fragment } from "react";

interface HeaderProps {
	title: string;
	breadcrumbs?: string[];
}

export function Header({ title, breadcrumbs = [] }: HeaderProps) {
	const { settings } = useSettings();
	const icons = settings.ui.useNerdfonts ? glyphs : fallbackGlyphs;

	const crumbs = ["Todosh", ...breadcrumbs];

	return (
		<box
			flexDirection="row"
			paddingX={1}
			border={["bottom"]}
			borderStyle="single"
			borderColor={inkColor("gray")}
		>
			<Text attributes={BOLD} fg={inkColor("cyan")}>
				{crumbs.map((crumb, i) => (
					// The accumulated path is unique even when two crumbs share a name.
					<Fragment key={crumbs.slice(0, i + 1).join("/")}>
						{i > 0 && <span fg={inkColor("gray")}> {icons.arrow} </span>}
						<span fg={inkColor(i === crumbs.length - 1 ? "white" : "gray")}>
							{crumb}
						</span>
					</Fragment>
				))}
			</Text>
			<box flexGrow={1} />
			<Text attributes={DIM}>{title}</Text>
		</box>
	);
}
