import type { ScrollBoxRenderable } from "@opentui/core";
import { type RefObject, useEffect } from "react";

/**
 * Keep the selected child of a `<scrollbox>` in view.
 *
 * Replaces the hand-rolled centre-on-selection windowing the Ink components
 * used. `scrollChildIntoView` scrolls the minimum distance needed, so an item
 * that already fits does not move the viewport.
 */
export function useScrollIntoView(
	ref: RefObject<ScrollBoxRenderable | null>,
	childId: string | undefined,
) {
	useEffect(() => {
		if (!childId) return;
		ref.current?.scrollChildIntoView(childId);
	}, [ref, childId]);
}
