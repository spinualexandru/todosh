import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { Modal } from "./modal";

interface ConfirmProps {
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmLabel?: string;
	cancelLabel?: string;
	dangerous?: boolean;
}

export function Confirm({
	title,
	message,
	onConfirm,
	onCancel,
	confirmLabel = "Yes",
	cancelLabel = "No",
	dangerous = false,
}: ConfirmProps) {
	const [selected, setSelected] = useState(0);

	useInput((input, key) => {
		if (key.leftArrow || input === "h") {
			setSelected(0);
		} else if (key.rightArrow || input === "l") {
			setSelected(1);
		} else if (key.return) {
			if (selected === 0) {
				onCancel();
			} else {
				onConfirm();
			}
		} else if (key.escape || input === "n") {
			onCancel();
		} else if (input === "y") {
			onConfirm();
		}
	});

	return (
		<Modal title={title}>
			<Text>{message}</Text>
			<Box marginTop={1} gap={2}>
				<Box>
					<Text
						inverse={selected === 0}
						color={selected === 0 ? "white" : undefined}
					>
						{" "}
						{cancelLabel}{" "}
					</Text>
				</Box>
				<Box>
					<Text
						inverse={selected === 1}
						color={selected === 1 ? (dangerous ? "red" : "green") : undefined}
					>
						{" "}
						{confirmLabel}{" "}
					</Text>
				</Box>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>←/→ to select • Enter to confirm • Esc to cancel</Text>
			</Box>
		</Modal>
	);
}
