import { useBindings } from "@opentui/keymap/react";
import { useRef } from "react";
import { KeymapPriority } from "./useKeymap";

/**
 * Bind Escape on its own, above every other layer.
 *
 * Text inputs need this instead of the `back` action: in `default` mode `back`
 * is also bound to Backspace, which the input must keep for editing.
 */
export function useEscapeKey(
	handler: (() => void) | undefined,
	isActive = true,
) {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	const enabled = isActive && handler !== undefined;

	useBindings(
		() => ({
			enabled,
			priority: KeymapPriority.overlay + 10,
			bindings: [
				{
					key: "escape",
					cmd: () => {
						handlerRef.current?.();
					},
				},
			],
		}),
		[enabled],
	);
}
