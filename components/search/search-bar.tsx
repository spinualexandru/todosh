import { fallbackGlyphs, glyphs } from "@utils";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
	onClose: () => void;
	resultCount: number;
	useNerdfonts: boolean;
}

export function SearchBar({
	value,
	onChange,
	onClose,
	resultCount,
	useNerdfonts,
}: SearchBarProps) {
	const icons = useNerdfonts ? glyphs : fallbackGlyphs;
	const [cursorPos, setCursorPos] = useState(value.length);

	useEffect(() => {
		setCursorPos(value.length);
	}, [value.length]);

	useInput((input, key) => {
		if (key.escape) {
			onClose();
			return;
		}

		if (key.backspace || key.delete) {
			if (cursorPos > 0) {
				const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
				onChange(newValue);
				setCursorPos(cursorPos - 1);
			}
			return;
		}

		if (key.leftArrow) {
			setCursorPos(Math.max(0, cursorPos - 1));
			return;
		}

		if (key.rightArrow) {
			setCursorPos(Math.min(value.length, cursorPos + 1));
			return;
		}

		if (input && !key.ctrl && !key.meta && !key.return) {
			const newValue =
				value.slice(0, cursorPos) + input + value.slice(cursorPos);
			onChange(newValue);
			setCursorPos(cursorPos + input.length);
		}
	});

	const beforeCursor = value.slice(0, cursorPos);
	const cursorChar = value[cursorPos] || " ";
	const afterCursor = value.slice(cursorPos + 1);

	return (
		<Box borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
			<Text color="cyan">{icons.search} </Text>
			<Text>
				<Text>{beforeCursor}</Text>
				<Text inverse>{cursorChar}</Text>
				<Text>{afterCursor}</Text>
			</Text>
			<Box flexGrow={1} />
			<Text dimColor>
				{resultCount} result{resultCount !== 1 ? "s" : ""} • Esc to close
			</Text>
		</Box>
	);
}
