import { InputFocusContext } from "@contexts/input-focus";
import { useBindings } from "@opentui/keymap/react";
import type { KeybindMode } from "@types";
import { useContext, useMemo, useRef } from "react";
import { useSettings } from "./useSettings";

type Action =
	| "up"
	| "down"
	| "left"
	| "right"
	| "moveLeft"
	| "moveRight"
	| "select"
	| "back"
	| "delete"
	| "archive"
	| "search"
	| "help"
	| "new"
	| "edit"
	| "move"
	| "toggleView"
	| "pin"
	| "quit";

type KeymapConfig = Record<Action, string[]>;

const keymaps: Record<KeybindMode, KeymapConfig> = {
	default: {
		up: ["up"],
		down: ["down"],
		left: ["left"],
		right: ["right"],
		moveLeft: ["alt+left"],
		moveRight: ["alt+right"],
		select: ["return"],
		back: ["escape", "backspace"],
		delete: ["d"],
		archive: ["a"],
		search: ["/"],
		help: ["?"],
		new: ["n"],
		edit: ["e"],
		move: ["m"],
		toggleView: ["tab"],
		pin: ["p"],
		quit: ["q"],
	},
	vim: {
		up: ["up", "k"],
		down: ["down", "j"],
		left: ["left", "h"],
		right: ["right", "l"],
		moveLeft: ["alt+left", "alt+h"],
		moveRight: ["alt+right", "alt+l"],
		select: ["return"],
		back: ["escape"],
		delete: ["d", "x"],
		archive: ["a"],
		search: ["/"],
		help: ["?"],
		new: ["n", "o"],
		edit: ["e", "i"],
		move: ["m"],
		toggleView: ["tab"],
		pin: ["p"],
		quit: ["q"],
	},
};

/** Iteration order matches the keymap tables, preserving dispatch precedence. */
const ACTIONS = Object.keys(keymaps.default) as Action[];

interface KeymapHandlers {
	onUp?: () => void;
	onDown?: () => void;
	onLeft?: () => void;
	onRight?: () => void;
	onMoveLeft?: () => void;
	onMoveRight?: () => void;
	onSelect?: () => void;
	onBack?: () => void;
	onDelete?: () => void;
	onArchive?: () => void;
	onSearch?: () => void;
	onHelp?: () => void;
	onNew?: () => void;
	onEdit?: () => void;
	onMove?: () => void;
	onToggleView?: () => void;
	onPin?: () => void;
	onQuit?: () => void;
}

const HANDLER_KEYS: Record<Action, keyof KeymapHandlers> = {
	up: "onUp",
	down: "onDown",
	left: "onLeft",
	right: "onRight",
	moveLeft: "onMoveLeft",
	moveRight: "onMoveRight",
	select: "onSelect",
	back: "onBack",
	delete: "onDelete",
	archive: "onArchive",
	search: "onSearch",
	help: "onHelp",
	new: "onNew",
	edit: "onEdit",
	move: "onMove",
	toggleView: "onToggleView",
	pin: "onPin",
	quit: "onQuit",
};

/** Layer priorities. Higher wins; within a priority the newest layer wins. */
export const KeymapPriority = {
	/** Always-on app shortcuts. Must lose to everything else. */
	root: -100,
	/** The keymap owned by the current view. */
	view: 0,
	/** Modals, pickers and other transient overlays. */
	overlay: 100,
} as const;

interface UseKeymapOptions {
	handlers: KeymapHandlers;
	isActive?: boolean;
	priority?: number;
	/**
	 * Keep the layer live while a text input holds the keyboard. Only the
	 * inputs' own escape/submit layers should set this.
	 */
	allowWhileTyping?: boolean;
}

export function useKeymap({
	handlers,
	isActive = true,
	priority = KeymapPriority.view,
	allowWhileTyping = false,
}: UseKeymapOptions) {
	const { settings } = useSettings();
	const mode = settings.keybinds.mode;
	const keymap = useMemo(() => keymaps[mode], [mode]);

	const inputFocus = useContext(InputFocusContext);
	const typing = inputFocus?.inputFocused ?? false;

	// Handlers are inline object literals at every call site, so their identity
	// changes each render. Read them through a ref instead of re-registering the
	// keymap layer on every render.
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	// Only actions with a handler get a binding. Under Ink the dispatch loop
	// fell through to a later action when the matched one had no handler;
	// omitting handler-less bindings reproduces that with a single-winner engine.
	const boundActions = ACTIONS.filter(
		(action) => handlers[HANDLER_KEYS[action]] !== undefined,
	);
	const signature = boundActions.join(",");

	const enabled = isActive && (allowWhileTyping || !typing);

	useBindings(
		() => ({
			enabled,
			priority,
			bindings: boundActions.flatMap((action) =>
				keymap[action].map((key) => ({
					key,
					cmd: () => {
						handlersRef.current[HANDLER_KEYS[action]]?.();
					},
				})),
			),
		}),
		[signature, mode, enabled, priority],
	);

	return { keymap, mode };
}

export function getKeybindHint(action: Action, mode: KeybindMode): string {
	const keys = keymaps[mode][action];
	if (!keys || keys.length === 0) return "";

	const displayKey = (k: string): string => {
		const hasAlt = k.startsWith("alt+");
		const baseKey = hasAlt ? k.slice(4) : k;
		const prefix = hasAlt ? "Alt+" : "";

		switch (baseKey) {
			case "up":
				return `${prefix}↑`;
			case "down":
				return `${prefix}↓`;
			case "left":
				return `${prefix}←`;
			case "right":
				return `${prefix}→`;
			case "return":
				return `${prefix}⏎`;
			case "escape":
				return `${prefix}Esc`;
			case "backspace":
				return `${prefix}⌫`;
			case "tab":
				return `${prefix}Tab`;
			default:
				return `${prefix}${baseKey}`;
		}
	};

	return keys.map(displayKey).join("/");
}
