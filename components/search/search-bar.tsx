import { Text } from "@components/common";
import { useEscapeKey, useInputFocus } from "@hooks";
import { useKeys } from "@hooks/useKeys";
import { DIM, fallbackGlyphs, glyphs, inkColor } from "@utils";

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
	onClose: () => void;
	onUp?: () => void;
	onDown?: () => void;
	onSelect?: () => void;
	resultCount: number;
	useNerdfonts: boolean;
}

export function SearchBar({
	value,
	onChange,
	onClose,
	onUp,
	onDown,
	onSelect,
	resultCount,
	useNerdfonts,
}: SearchBarProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;

	useInputFocus(true);
	useEscapeKey(onClose);
	// Bind literal keys so Vim's j/k remain available for typing the query.
	useKeys({ up: onUp, down: onDown, return: onSelect });

	return (
		<box
			flexDirection="row"
			border
			borderStyle="rounded"
			borderColor={inkColor("cyan")}
			paddingX={1}
			marginBottom={1}
		>
			<Text fg={inkColor("cyan")}>{icons.search} </Text>
			<input
				flexGrow={1}
				focused
				value={value}
				onInput={onChange}
				textColor={inkColor("white")}
				cursorColor={inkColor("cyan")}
			/>
			<Text attributes={DIM}>
				{resultCount} result{resultCount !== 1 ? "s" : ""}
				{onUp && onDown ? " • ↑/↓ navigate" : ""}
				{onSelect ? " • Enter to open" : ""} • Esc to close
			</Text>
		</box>
	);
}
