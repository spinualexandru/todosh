import { RGBA } from "@opentui/core";

/**
 * OpenTUI's `parseColor` only knows 28 CSS names and falls back to
 * `hexToRgb`, which warns on stderr and returns magenta for anything else.
 * The app stores chalk/Ink colour names (including `lightCyan`, and arbitrary
 * user-supplied `tags.color` values), so every colour goes through here first.
 *
 * Names resolve to indexed ANSI slots rather than literal RGB so the user's
 * terminal theme still applies, exactly as it did under chalk.
 *
 * `white` and `black` are deliberately absent: chalk used them to mean
 * "emphasised text" and "text on a highlight", which only reads correctly on a
 * dark terminal. They resolve to the terminal's own default foreground and
 * background instead, so both themes stay legible. See {@link THEME_RELATIVE}.
 */
const ANSI_SLOTS: Record<string, number> = {
	red: 1,
	green: 2,
	yellow: 3,
	blue: 4,
	magenta: 5,
	cyan: 6,
	blackbright: 8,
	redbright: 9,
	greenbright: 10,
	yellowbright: 11,
	bluebright: 12,
	magentabright: 13,
	cyanbright: 14,
	whitebright: 15,
	lightblack: 8,
	lightred: 9,
	lightgreen: 10,
	lightyellow: 11,
	lightblue: 12,
	lightmagenta: 13,
	lightcyan: 14,
	lightwhite: 15,
};

const cache = new Map<string, RGBA>();

export type ThemeMode = "dark" | "light";

let currentTheme: ThemeMode = "dark";

/**
 * Muted ("dimmed") text colour per theme.
 *
 * Not `TextAttributes.DIM` and not ANSI 8: both fade *toward* the background,
 * which is legible on a dark terminal and nearly invisible on a light one.
 * These are explicit mid-greys that hold contrast against either background.
 */
const MUTED: Record<ThemeMode, string> = {
	dark: "#9AA0A6",
	light: "#5F6368",
};

/** Set by `ThemeProvider` whenever the terminal's light/dark mode is known. */
export function setColorTheme(mode: ThemeMode): void {
	if (mode === currentTheme) return;
	currentTheme = mode;
	cache.clear();
}

export function getColorTheme(): ThemeMode {
	return currentTheme;
}

/** The muted text colour for the active terminal theme. */
export function mutedColor(): RGBA {
	return RGBA.fromHex(MUTED[currentTheme]);
}

const THEME_RELATIVE: Record<string, () => RGBA> = {
	white: () => RGBA.defaultForeground(),
	black: () => RGBA.defaultBackground(),
	gray: mutedColor,
	grey: mutedColor,
};

const HEX = /^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Resolve a chalk/Ink colour name or hex string to an RGBA value.
 * Unrecognised input resolves to the terminal's default foreground rather
 * than tripping OpenTUI's magenta fallback.
 */
export function inkColor(name: string | undefined | null): RGBA {
	if (!name) return RGBA.defaultForeground();

	const cached = cache.get(name);
	if (cached) return cached;

	const key = name.toLowerCase();
	const themeRelative = THEME_RELATIVE[key];
	if (themeRelative) {
		// Not cached: these track the terminal's current palette.
		return themeRelative();
	}

	const slot = ANSI_SLOTS[key];
	let color: RGBA;
	if (slot !== undefined) {
		color = RGBA.fromIndex(slot);
	} else if (HEX.test(name)) {
		color = RGBA.fromHex(name.startsWith("#") ? name : `#${name}`);
	} else {
		color = RGBA.defaultForeground();
	}

	cache.set(name, color);
	return color;
}

/**
 * The terminal's own background, as an opaque fill.
 *
 * OpenTUI boxes default to a transparent background, so whatever is behind
 * them blends through. Ink composited absolute elements over the frame
 * instead, so overlays need an explicit opaque fill to occlude.
 */
export function defaultBackground(): RGBA {
	return RGBA.defaultBackground();
}

/**
 * Props for a highlighted (selected) run of text.
 *
 * Ink's `<Text inverse color="cyan">` rendered as cyan-background text in the
 * terminal's default foreground. OpenTUI's `TextAttributes.INVERSE` instead
 * emits `fg=X; bg=X; SGR 7`, which paints a solid block and hides the glyph, so
 * the swap has to be spelled out.
 *
 * Returns nothing when inactive, so it can be spread unconditionally.
 */
export function selection(
	active: boolean,
	color?: string,
): { fg?: RGBA; bg?: RGBA } {
	if (!active) return {};
	return {
		fg: RGBA.defaultBackground(),
		bg: color ? inkColor(color) : RGBA.defaultForeground(),
	};
}

/** Same as {@link inkColor} but passes `undefined` straight through. */
export function optionalInkColor(
	name: string | undefined | null,
): RGBA | undefined {
	return name ? inkColor(name) : undefined;
}
