import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Settings } from "@types";
import { getSettingsPath } from "@utils/paths";
import { defaultSettings } from "./defaults";

const DEFAULT_TOML = `# Todosh Configuration

[ui]
theme = "default"
useNerdfonts = true
showArchived = false

[keybinds]
mode = "default"  # "default" or "vim"

[ipc]
enabled = true
# socketPath = "/tmp/todosh.sock"

[database]
# path = ""  # Uses XDG_DATA_HOME by default

# defaultBoard = 1
`;

function deepMerge<T extends Record<string, unknown>>(
	target: T,
	source: Partial<T>,
): T {
	const result = { ...target };
	for (const key in source) {
		const sourceVal = source[key];
		const targetVal = target[key];
		if (
			sourceVal &&
			typeof sourceVal === "object" &&
			!Array.isArray(sourceVal) &&
			targetVal &&
			typeof targetVal === "object" &&
			!Array.isArray(targetVal)
		) {
			result[key] = deepMerge(
				targetVal as Record<string, unknown>,
				sourceVal as Record<string, unknown>,
			) as T[Extract<keyof T, string>];
		} else if (sourceVal !== undefined) {
			result[key] = sourceVal as T[Extract<keyof T, string>];
		}
	}
	return result;
}

export async function loadSettings(customPath?: string): Promise<Settings> {
	const settingsPath = customPath ?? getSettingsPath();

	if (!existsSync(settingsPath)) {
		const dir = dirname(settingsPath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(settingsPath, DEFAULT_TOML);
		return defaultSettings;
	}

	try {
		const config = await import(settingsPath);
		return deepMerge(defaultSettings, config.default ?? config);
	} catch {
		return defaultSettings;
	}
}

export function saveSettings(settings: Settings, customPath?: string): void {
	const settingsPath = customPath ?? getSettingsPath();
	const dir = dirname(settingsPath);

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const toml = `# Todosh Configuration

[ui]
theme = "${settings.ui.theme}"
useNerdfonts = ${settings.ui.useNerdfonts}
showArchived = ${settings.ui.showArchived}

[keybinds]
mode = "${settings.keybinds.mode}"

[ipc]
enabled = ${settings.ipc.enabled}
${settings.ipc.socketPath ? `socketPath = "${settings.ipc.socketPath}"` : '# socketPath = "/tmp/todosh.sock"'}

[database]
${settings.database.path ? `path = "${settings.database.path}"` : '# path = ""'}

${settings.defaultBoard ? `defaultBoard = ${settings.defaultBoard}` : "# defaultBoard = 1"}
`;

	writeFileSync(settingsPath, toml);
}
