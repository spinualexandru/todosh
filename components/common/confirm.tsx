import { useKeys } from "@hooks";
import { DIM, selection } from "@utils";
import { useState } from "react";
import { Modal } from "./modal";
import { Text } from "./text";

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

	useKeys({
		left: () => setSelected(0),
		h: () => setSelected(0),
		right: () => setSelected(1),
		l: () => setSelected(1),
		return: () => (selected === 0 ? onCancel() : onConfirm()),
		escape: onCancel,
		n: onCancel,
		y: onConfirm,
	});

	return (
		<Modal title={title}>
			<Text>{message}</Text>
			<box flexDirection="row" marginTop={1} gap={2}>
				<box flexDirection="row">
					<Text {...selection(selected === 0, "white")}> {cancelLabel} </Text>
				</box>
				<box flexDirection="row">
					<Text {...selection(selected === 1, dangerous ? "red" : "green")}>
						{" "}
						{confirmLabel}{" "}
					</Text>
				</box>
			</box>
			<box flexDirection="row" marginTop={1}>
				<Text attributes={DIM}>
					←/→ to select • Enter to confirm • Esc to cancel
				</Text>
			</box>
		</Modal>
	);
}
