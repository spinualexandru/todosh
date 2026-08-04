import { useBindings } from "@opentui/keymap/react";
import { useRef } from "react";
import { KeymapPriority } from "./useKeymap";

type KeyHandlers = Record<string, (() => void) | undefined>;

interface UseKeysOptions {
	isActive?: boolean;
	priority?: number;
}

/**
 * Register ad-hoc key bindings for components that never used the shared
 * `Action` keymap (confirm dialogs, the filter menu, the task editor).
 *
 * Handlers are read through a ref so inline arrow functions do not force the
 * keymap layer to re-register on every render.
 */
export function useKeys(
	bindings: KeyHandlers,
	{ isActive = true, priority = KeymapPriority.overlay }: UseKeysOptions = {},
) {
	const bindingsRef = useRef(bindings);
	bindingsRef.current = bindings;

	const keys = Object.keys(bindings).filter((k) => bindings[k] !== undefined);
	const signature = keys.join(",");

	useBindings(
		() => ({
			enabled: isActive,
			priority,
			bindings: keys.map((key) => ({
				key,
				cmd: () => {
					bindingsRef.current[key]?.();
				},
			})),
		}),
		[signature, isActive, priority],
	);
}
