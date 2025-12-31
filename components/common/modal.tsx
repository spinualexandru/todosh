import { getTerminalSize } from "@hooks";
import { Box, Text, useStdout } from "ink";
import type { ReactNode } from "react";

interface ModalProps {
	title: string;
	children: ReactNode;
	width?: number;
}

export function Modal({ title, children, width = 50 }: ModalProps) {
	const { stdout } = useStdout();
	const { columns, rows } = getTerminalSize(stdout);

	const modalWidth = Math.min(width, columns - 4);
	const left = Math.floor((columns - modalWidth) / 2);

	return (
		<Box
			position="absolute"
			marginLeft={left}
			marginTop={Math.floor(rows / 4)}
			width={modalWidth}
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
		>
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
					{title}
				</Text>
			</Box>
			<Box paddingX={1} paddingY={1} flexDirection="column">
				{children}
			</Box>
		</Box>
	);
}
