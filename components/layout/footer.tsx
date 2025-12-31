import { useRouter, useSettings } from "@hooks";
import { getKeybindHint } from "@hooks/useKeymap";
import { Box, Text } from "ink";

interface KeyHint {
	action: string;
	label: string;
}

interface FooterProps {
	hints?: KeyHint[];
}

const defaultHints: KeyHint[] = [
	{ action: "select", label: "Select" },
	{ action: "back", label: "Back" },
	{ action: "new", label: "New" },
	{ action: "help", label: "Help" },
	{ action: "quit", label: "Quit" },
];

export function Footer({ hints = defaultHints }: FooterProps) {
	const { settings } = useSettings();
	const { canGoBack } = useRouter();
	const mode = settings.keybinds.mode;

	const filteredHints = hints.filter((hint) => {
		if (hint.action === "back" && !canGoBack) return false;
		return true;
	});

	return (
		<Box
			paddingX={1}
			borderStyle="single"
			borderTop
			borderBottom={false}
			borderLeft={false}
			borderRight={false}
			borderColor="gray"
			gap={2}
		>
			{filteredHints.map((hint) => (
				<Box key={hint.action} gap={1}>
					<Text color="cyan" bold>
						{getKeybindHint(
							hint.action as Parameters<typeof getKeybindHint>[0],
							mode,
						)}
					</Text>
					<Text dimColor>{hint.label}</Text>
				</Box>
			))}
		</Box>
	);
}
