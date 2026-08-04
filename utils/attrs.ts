import { TextAttributes } from "@opentui/core";

interface TextStyle {
	bold?: boolean;
	dim?: boolean;
	italic?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
}

/**
 * Build an OpenTUI `attributes` bitmask from the boolean style flags the
 * components used to pass to Ink's `<Text bold dimColor italic>`.
 *
 * Deliberately no `inverse`: OpenTUI's `TextAttributes.INVERSE` emits
 * `fg=X; bg=X; SGR 7`, which paints a solid block instead of the readable
 * highlight Ink produced. Use `selection()` from `./colors` instead.
 */
export function attrs(style: TextStyle): number {
	let mask = 0;
	if (style.bold) mask |= TextAttributes.BOLD;
	if (style.dim) mask |= TextAttributes.DIM;
	if (style.italic) mask |= TextAttributes.ITALIC;
	if (style.underline) mask |= TextAttributes.UNDERLINE;
	if (style.strikethrough) mask |= TextAttributes.STRIKETHROUGH;
	return mask;
}

export const DIM = TextAttributes.DIM;
export const BOLD = TextAttributes.BOLD;
export const ITALIC = TextAttributes.ITALIC;
export const BOLD_DIM = TextAttributes.BOLD | TextAttributes.DIM;
export const DIM_ITALIC = TextAttributes.DIM | TextAttributes.ITALIC;
