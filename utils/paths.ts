import { homedir } from "node:os";
import { join } from "node:path";

function getEnv(key: string): string | undefined {
	return process.env[key];
}

export function getConfigHome(): string {
	return getEnv("XDG_CONFIG_HOME") ?? join(homedir(), ".config");
}

export function getDataHome(): string {
	return getEnv("XDG_DATA_HOME") ?? join(homedir(), ".local", "share");
}

export function getRuntimeDir(): string {
	return getEnv("XDG_RUNTIME_DIR") ?? "/tmp";
}

export function getConfigDir(): string {
	return join(getConfigHome(), "todosh");
}

export function getDataDir(): string {
	return join(getDataHome(), "todosh");
}

export function getSettingsPath(): string {
	return join(getConfigDir(), "settings.toml");
}

export function getDatabasePath(): string {
	return join(getDataDir(), "data.db");
}

export function getSocketPath(): string {
	return join(getRuntimeDir(), "todosh.sock");
}
