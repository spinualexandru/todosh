import { useInputFocus } from "@hooks/useInputFocus";
import { useKeyboard, usePaste } from "@opentui/react";
import { DIM, inkColor } from "@utils";
import { useRef, useState } from "react";

import { Text } from "./text";

/** Keep secret text out of the render tree, native input buffer, and undo history. */
export function SecretInput({
	onSubmit,
	onCancel,
	busy,
}: {
	onSubmit: (value: string) => void;
	onCancel: () => void;
	busy: boolean;
}) {
	const value = useRef("");
	const [length, setLength] = useState(0);
	useInputFocus(true);
	const update = (next: string) => {
		value.current = next;
		setLength(next.length);
	};
	useKeyboard((key) => {
		key.preventDefault();
		key.stopPropagation();
		if (busy) return;
		if (key.name === "escape") {
			update("");
			onCancel();
		} else if (key.name === "return") {
			const secret = value.current;
			update("");
			onSubmit(secret);
		} else if (key.name === "backspace" || key.name === "delete")
			update(value.current.slice(0, -1));
		else if (key.ctrl && key.name === "u") update("");
		else if (
			!key.ctrl &&
			!key.meta &&
			!key.option &&
			/^[\x20-\x7e]+$/.test(key.sequence)
		)
			update((value.current + key.sequence).slice(0, 4096));
	});
	usePaste((event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!busy)
			update(
				(
					value.current +
					new TextDecoder().decode(event.bytes).replace(/[^\x20-\x7e]/g, "")
				).slice(0, 4096),
			);
	});
	return (
		<box flexDirection="row">
			<Text fg={inkColor("cyan")}>API key: </Text>
			<Text attributes={length ? 0 : DIM}>
				{length ? "*".repeat(Math.min(length, 32)) : "Paste or type your key…"}
			</Text>
		</box>
	);
}
