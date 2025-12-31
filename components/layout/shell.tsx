import { getTerminalSize } from "@hooks";
import { Box, useStdout } from "ink";
import { type ReactNode, useEffect, useState } from "react";
import { Footer } from "./footer";
import { Header } from "./header";

interface ShellProps {
	children: ReactNode;
	title: string;
	breadcrumbs?: string[];
}

export function Shell({ children, title, breadcrumbs = [] }: ShellProps) {
	const { stdout } = useStdout();
	const [{ columns, rows }, setTerminalSize] = useState(() =>
		getTerminalSize(stdout),
	);

	useEffect(() => {
		setTerminalSize(getTerminalSize(stdout));
		const handleResize = () => setTerminalSize(getTerminalSize(stdout));
		stdout?.on?.("resize", handleResize);
		return () => {
			stdout?.off?.("resize", handleResize);
		};
	}, [stdout]);

	useEffect(() => {
		stdout?.write("\x1b[2J\x1b[H\x1b[?25l");
		return () => {
			stdout?.write("\x1b[?25h");
		};
	}, [stdout]);

	const contentHeight = rows - 4;

	return (
		<Box
			width={columns}
			height={rows}
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
		>
			<Header title={title} breadcrumbs={breadcrumbs} />
			<Box
				flexGrow={1}
				height={contentHeight}
				paddingX={1}
				flexDirection="column"
			>
				{children}
			</Box>
			<Footer />
		</Box>
	);
}
