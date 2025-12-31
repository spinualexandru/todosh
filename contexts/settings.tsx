import { defaultSettings, loadSettings, saveSettings } from "@lib/settings";
import type { Settings } from "@types";
import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";

interface SettingsContextValue {
	settings: Settings;
	updateSettings: (updates: Partial<Settings>) => void;
	isLoading: boolean;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
	children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
	const [settings, setSettings] = useState<Settings>(defaultSettings);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadSettings()
			.then(setSettings)
			.finally(() => setIsLoading(false));
	}, []);

	const updateSettings = useCallback((updates: Partial<Settings>) => {
		setSettings((prev) => {
			const next = { ...prev, ...updates };
			saveSettings(next);
			return next;
		});
	}, []);

	return (
		<SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
			{children}
		</SettingsContext.Provider>
	);
}
