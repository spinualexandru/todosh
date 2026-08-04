import { BOLD, defaultBackground, inkColor } from "@utils";
import type { ReactNode } from "react";
import { Text } from "./text";

interface ModalProps {
	title: string;
	children: ReactNode;
	width?: number;
}

export function Modal({ title, children, width = 50 }: ModalProps) {
	return (
		// Absolute positioning takes the overlay out of flow and zIndex lifts it
		// above its siblings, so Yoga can centre it instead of the hand-computed
		// marginLeft/marginTop the Ink version needed.
		<box
			position="absolute"
			left={0}
			top={0}
			width="100%"
			height="100%"
			zIndex={100}
			alignItems="center"
			justifyContent="center"
		>
			<box
				width={width}
				maxWidth="100%"
				flexDirection="column"
				border
				borderStyle="rounded"
				borderColor={inkColor("cyan")}
				// Opaque, or the view underneath blends through the overlay.
				backgroundColor={defaultBackground()}
			>
				<box
					flexDirection="row"
					paddingX={1}
					border={["bottom"]}
					borderStyle="single"
					borderColor={inkColor("gray")}
				>
					<Text attributes={BOLD} fg={inkColor("cyan")}>
						{title}
					</Text>
				</box>
				<box paddingX={1} paddingY={1} flexDirection="column">
					{children}
				</box>
			</box>
		</box>
	);
}
