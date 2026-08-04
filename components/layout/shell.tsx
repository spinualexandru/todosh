import { useTerminalSize } from "@hooks";
import { inkColor } from "@utils";
import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header } from "./header";

interface KeyHint {
	action: string;
	label: string;
}

interface ShellProps {
	children: ReactNode;
	title: string;
	breadcrumbs?: string[];
	hints?: KeyHint[];
}

export function Shell({
	children,
	title,
	breadcrumbs = [],
	hints,
}: ShellProps) {
	const { columns, rows } = useTerminalSize();

	return (
		<box
			width={columns}
			height={rows}
			flexDirection="column"
			border
			borderStyle="rounded"
			borderColor={inkColor("cyan")}
		>
			<Header title={title} breadcrumbs={breadcrumbs} />
			{/*
			 * No explicit height: the outer border (2 rows), header (2) and footer
			 * (2) already claim 6 rows, so letting Yoga size this leaves exactly the
			 * `rows - 6` the views budget for themselves. Forcing a height here
			 * over-constrains the column and collapses the header/footer borders.
			 */}
			<box
				flexGrow={1}
				flexShrink={1}
				flexBasis={0}
				paddingX={1}
				flexDirection="column"
			>
				{children}
			</box>
			<Footer hints={hints} />
		</box>
	);
}
