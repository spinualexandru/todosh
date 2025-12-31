import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

interface InputProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit?: (value: string) => void;
	onCancel?: () => void;
	placeholder?: string;
	label?: string;
	focus?: boolean;
}

export function Input({
	value,
	onChange,
	onSubmit,
	onCancel,
	placeholder = "",
	label,
	focus = true,
}: InputProps) {
	const [cursorPos, setCursorPos] = useState(value.length);

	useEffect(() => {
		setCursorPos(value.length);
	}, [value.length]);

	useInput(
		(input, key) => {
			if (key.return && onSubmit) {
				onSubmit(value);
				return;
			}

			if (key.escape && onCancel) {
				onCancel();
				return;
			}

			if (key.backspace || key.delete) {
				if (cursorPos > 0) {
					const newValue =
						value.slice(0, cursorPos - 1) + value.slice(cursorPos);
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

			if (input && !key.ctrl && !key.meta) {
				const newValue =
					value.slice(0, cursorPos) + input + value.slice(cursorPos);
				onChange(newValue);
				setCursorPos(cursorPos + input.length);
			}
		},
		{ isActive: focus },
	);

	const displayValue = value || placeholder;
	const isPlaceholder = !value && placeholder;

	const beforeCursor = value.slice(0, cursorPos);
	const cursorChar = value[cursorPos] || " ";
	const afterCursor = value.slice(cursorPos + 1);

	return (
		<Box>
			{label && (
				<Text color="cyan" bold>
					{label}:{" "}
				</Text>
			)}
			{focus ? (
				<Text>
					<Text>{beforeCursor}</Text>
					<Text inverse>{cursorChar}</Text>
					<Text>{afterCursor}</Text>
				</Text>
			) : (
				<Text dimColor={isPlaceholder}>{displayValue}</Text>
			)}
		</Box>
	);
}
