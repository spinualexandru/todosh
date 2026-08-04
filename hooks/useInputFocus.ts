import { InputFocusContext } from "@contexts/input-focus";
import { useContext, useEffect } from "react";

/**
 * Declare that a focused text input owns the keyboard, so always-on keymap
 * layers (which `preventDefault` by default) stand down while typing.
 */
export function useInputFocus(active: boolean) {
	const ctx = useContext(InputFocusContext);

	useEffect(() => {
		if (!active || !ctx) return;
		return ctx.registerInput();
	}, [active, ctx]);
}
