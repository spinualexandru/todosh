import { useTerminalDimensions } from "@opentui/react";

/**
 * Reactive terminal size with the same floors the Ink-era `getTerminalSize`
 * applied. Unlike that helper this re-renders on resize, so every view picks
 * up new dimensions rather than only `Shell`.
 */
export function useTerminalSize(): { columns: number; rows: number } {
	const { width, height } = useTerminalDimensions();
	return {
		columns: Math.max(20, width),
		rows: Math.max(8, height),
	};
}
