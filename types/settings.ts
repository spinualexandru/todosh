export type KeybindMode = "default" | "vim";
export type Theme = "default" | "minimal";

export interface UISettings {
	theme: Theme;
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
