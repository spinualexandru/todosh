import { stopSocketServer } from "@lib/ipc";
import { useRenderer } from "@opentui/react";
import { useCallback } from "react";

/**
 * Tear down the TUI. Replaces Ink's `useApp().exit()`; OpenTUI does not clean
 * up on `process.exit`, so the renderer must be destroyed explicitly to
 * restore the terminal.
 */
export function useQuit(): () => void {
	const renderer = useRenderer();
	return useCallback(() => {
		stopSocketServer();
		renderer.destroy();
		process.exit(0);
	}, [renderer]);
}
