import {
	createContext,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";

interface InputFocusValue {
	/** True while at least one text input is mounted and focused. */
	inputFocused: boolean;
	/** Called by focused text inputs on mount/unmount. */
	registerInput: () => () => void;
}

export const InputFocusContext = createContext<InputFocusValue | undefined>(
	undefined,
);

/**
 * Tracks whether a text input currently owns the keyboard.
 *
 * OpenTUI keymap bindings default to `preventDefault: true`, which stops the
 * matched key reaching the focused renderable. Without this gate the global
 * `q` -> quit binding would swallow the letter `q` while typing.
 */
export function InputFocusProvider({ children }: { children: ReactNode }) {
	const [count, setCount] = useState(0);

	const registerInput = useCallback(() => {
		setCount((c) => c + 1);
		return () => setCount((c) => Math.max(0, c - 1));
	}, []);

	const value = useMemo(
		() => ({ inputFocused: count > 0, registerInput }),
		[count, registerInput],
	);

	return (
		<InputFocusContext.Provider value={value}>
			{children}
		</InputFocusContext.Provider>
	);
}
