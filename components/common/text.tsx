import { ThemeContext } from "@contexts/theme";
import { RGBA, TextAttributes } from "@opentui/core";
import type { TextProps } from "@opentui/react";
import { mutedColor } from "@utils";
import { useContext } from "react";

/**
 * `<text>` with theme-correct default and muted colours.
 *
 * Two OpenTUI/Ink differences are absorbed here so call sites keep using plain
 * `fg` / `attributes`:
 *
 * 1. `TextBufferRenderable` defaults `fg` to a literal white RGB
 *    (`RGBA.fromValues(1, 1, 1, 1)`), which emits `38;2;255;255;255` and is
 *    invisible on a light terminal. Defaulting to `RGBA.defaultForeground()`
 *    emits SGR 39, so the terminal picks the right side of its own palette.
 *
 * 2. `TextAttributes.DIM` (SGR 2) fades toward the background. That reads on a
 *    dark terminal and washes out on a light one, so an un-coloured DIM run is
 *    rendered as an explicit muted colour instead.
 *
 * `<span>` children inherit from the enclosing text node, so they need no
 * equivalent.
 */
export function Text({ fg, attributes = 0, ...props }: TextProps) {
	// Re-render when the terminal switches between light and dark.
	useContext(ThemeContext);

	const isDim = (attributes & TextAttributes.DIM) !== 0;

	// An explicit fg is left alone; SGR 2 still de-emphasises a coloured run
	// without erasing it.
	if (fg) return <text fg={fg} attributes={attributes} {...props} />;

	return (
		<text
			fg={isDim ? mutedColor() : RGBA.defaultForeground()}
			attributes={attributes & ~TextAttributes.DIM}
			{...props}
		/>
	);
}
