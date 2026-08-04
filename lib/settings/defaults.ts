import type { Settings } from "@types";

export const defaultSettings: Settings = {
	ui: {
		theme: "default",
		appearance: "auto",
		useNerdfonts: true,
		showArchived: false,
	},
	keybinds: {
		mode: "default",
	},
	ipc: {
		enabled: true,
	},
	database: {},
};
