export type KeybindMode = "default" | "vim";
export type Theme = "default" | "minimal";
/** Terminal background. "auto" uses OpenTUI's light/dark detection. */
export type Appearance = "auto" | "dark" | "light";

export interface UISettings {
	theme: Theme;
	appearance: Appearance;
	useNerdfonts: boolean;
	showArchived: boolean;
}

export interface KeybindSettings {
	mode: KeybindMode;
}

export interface IPCSettings {
	enabled: boolean;
	socketPath?: string;
}

export interface DatabaseSettings {
	path?: string;
}

export interface Settings {
	ui: UISettings;
	keybinds: KeybindSettings;
	ipc: IPCSettings;
	database: DatabaseSettings;
	defaultBoard?: number;
}
