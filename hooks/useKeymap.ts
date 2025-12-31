import type { KeybindMode } from "@types";
import { useInput } from "ink";
import { useCallback, useMemo } from "react";
import { useSettings } from "./useSettings";

type Action =
	| "up"
	| "down"
	| "left"
	| "right"
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
	| "quit";

type KeymapConfig = Record<Action, string[]>;

const keymaps: Record<KeybindMode, KeymapConfig> = {
	default: {
		up: ["upArrow"],
		down: ["downArrow"],
		left: ["leftArrow"],
		right: ["rightArrow"],
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
		quit: ["q"],
	},
	vim: {
		up: ["upArrow", "k"],
		down: ["downArrow", "j"],
		left: ["leftArrow", "h"],
		right: ["rightArrow", "l"],
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
		quit: ["q"],
	},
};

interface KeymapHandlers {
	onUp?: () => void;
	onDown?: () => void;
	onLeft?: () => void;
	onRight?: () => void;
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
	onQuit?: () => void;
}

interface UseKeymapOptions {
	handlers: KeymapHandlers;
	isActive?: boolean;
}

function normalizeKey(
	input: string,
	key: {
		upArrow: boolean;
		downArrow: boolean;
		leftArrow: boolean;
		rightArrow: boolean;
		return: boolean;
		escape: boolean;
		backspace: boolean;
		tab: boolean;
	},
): string {
	if (key.upArrow) return "upArrow";
	if (key.downArrow) return "downArrow";
	if (key.leftArrow) return "leftArrow";
	if (key.rightArrow) return "rightArrow";
	if (key.return) return "return";
	if (key.escape) return "escape";
	if (key.backspace) return "backspace";
	if (key.tab) return "tab";
	return input;
}

export function useKeymap({ handlers, isActive = true }: UseKeymapOptions) {
	const { settings } = useSettings();
	const keymap = useMemo(
		() => keymaps[settings.keybinds.mode],
		[settings.keybinds.mode],
	);

	const handleInput = useCallback(
		(
			input: string,
			key: {
				upArrow: boolean;
				downArrow: boolean;
				leftArrow: boolean;
				rightArrow: boolean;
				return: boolean;
				escape: boolean;
				backspace: boolean;
				tab: boolean;
			},
		) => {
			const normalizedKey = normalizeKey(input, key);

			const actionHandlers: Record<Action, (() => void) | undefined> = {
				up: handlers.onUp,
				down: handlers.onDown,
				left: handlers.onLeft,
				right: handlers.onRight,
				select: handlers.onSelect,
				back: handlers.onBack,
				delete: handlers.onDelete,
				archive: handlers.onArchive,
				search: handlers.onSearch,
				help: handlers.onHelp,
				new: handlers.onNew,
				edit: handlers.onEdit,
				move: handlers.onMove,
				toggleView: handlers.onToggleView,
				quit: handlers.onQuit,
			};

			for (const [action, keys] of Object.entries(keymap)) {
				if (keys.includes(normalizedKey)) {
					const handler = actionHandlers[action as Action];
					if (handler) {
						handler();
						return;
					}
				}
			}
		},
		[keymap, handlers],
	);

	useInput(handleInput, { isActive });

	return { keymap, mode: settings.keybinds.mode };
}

export function getKeybindHint(action: Action, mode: KeybindMode): string {
	const keys = keymaps[mode][action];
	if (!keys || keys.length === 0) return "";

	const displayKey = (k: string): string => {
		switch (k) {
			case "upArrow":
				return "↑";
			case "downArrow":
				return "↓";
			case "leftArrow":
				return "←";
			case "rightArrow":
				return "→";
			case "return":
				return "⏎";
			case "escape":
				return "Esc";
			case "backspace":
				return "⌫";
			case "tab":
				return "Tab";
			default:
				return k;
		}
	};

	return keys.map(displayKey).join("/");
}
