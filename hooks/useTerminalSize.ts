import { useRenderer } from "@opentui/react";
import { useCallback, useSyncExternalStore } from "react";

/** Read the renderer's current dimensions whenever its terminal geometry changes. */
export function useTerminalSize(): { columns: number; rows: number } {
	const renderer = useRenderer();
	const subscribe = useCallback(
		(notify: () => void) => {
			renderer.on("resize", notify);
			return () => {
				renderer.off("resize", notify);
			};
		},
		[renderer],
	);
	const getSnapshot = useCallback(
		() => `${renderer.width},${renderer.height}`,
		[renderer],
	);
	const dimensions = useSyncExternalStore(subscribe, getSnapshot);
	const [width = 20, height = 8] = dimensions.split(",").map(Number);
	return { columns: Math.max(20, width), rows: Math.max(8, height) };
}
