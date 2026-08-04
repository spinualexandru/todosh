import { useSettings } from "@hooks/useSettings";
import { useRenderer } from "@opentui/react";
import { setColorTheme, type ThemeMode } from "@utils";
import { createContext, type ReactNode, useEffect, useState } from "react";

export const ThemeContext = createContext<ThemeMode>("dark");

/**
 * Tracks whether the terminal has a light or dark background.
 *
 * OpenTUI detects this natively — `renderer.themeMode` plus a `theme_mode`
 * event, backed by DEC mode 2031 with an OSC 10/11 background-brightness
 * fallback — so no external detection library is needed. Terminals that
 * support neither report nothing; `[ui] appearance` overrides the result.
 *
 * The mode is pushed into `utils/colors` so the plain (non-hook) `inkColor`
 * helper can resolve muted colours, and mirrored into React state so the tree
 * re-renders when the terminal theme changes mid-session.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const renderer = useRenderer();
	const { settings } = useSettings();
	const override = settings.ui.appearance;

	const [detected, setDetected] = useState<ThemeMode>(
		renderer.themeMode ?? "dark",
	);

	useEffect(() => {
		if (override !== "auto") return;

		// Detection can land after the first paint.
		renderer.waitForThemeMode().then((mode) => {
			if (mode) setDetected(mode);
		});

		const onThemeChange = (mode: ThemeMode) => setDetected(mode);
		renderer.on("theme_mode", onThemeChange);
		return () => {
			renderer.off("theme_mode", onThemeChange);
		};
	}, [renderer, override]);

	const mode = override === "auto" ? detected : override;

	// Applied during render, not in an effect: children read colours
	// synchronously on this same pass.
	setColorTheme(mode);

	return <ThemeContext.Provider value={mode}>{children}</ThemeContext.Provider>;
}
