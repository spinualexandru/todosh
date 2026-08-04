import { Text } from "@components/common";
import { useRouter, useSettings } from "@hooks";
import { getKeybindHint } from "@hooks/useKeymap";
import { BOLD, DIM, inkColor } from "@utils";

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
		<box
			flexDirection="row"
			paddingX={1}
			border={["top"]}
			borderStyle="single"
			borderColor={inkColor("gray")}
			gap={2}
		>
			{filteredHints.map((hint) => (
				<box key={hint.action} flexDirection="row" gap={1}>
					<Text fg={inkColor("cyan")} attributes={BOLD}>
						{getKeybindHint(
							hint.action as Parameters<typeof getKeybindHint>[0],
							mode,
						)}
					</Text>
					<Text attributes={DIM}>{hint.label}</Text>
				</box>
			))}
		</box>
	);
}
