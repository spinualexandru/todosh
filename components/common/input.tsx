import { useEscapeKey, useInputFocus } from "@hooks";
import type { InputProps as OpenTuiInputProps } from "@opentui/react";
import { BOLD, DIM, inkColor } from "@utils";
import { Text } from "./text";

/**
 * `InputRenderableOptions` inherits `onSubmit(event)` from `TextareaOptions`
 * while `InputProps` adds `onSubmit(value)`, so the JSX prop type is the
 * intersection of both. The reconciler binds this prop to `InputRenderable`'s
 * ENTER event, which emits the string value, so the string form is correct.
 */
type SubmitHandler = NonNullable<OpenTuiInputProps["onSubmit"]>;

interface InputProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit?: (value: string) => void;
	onCancel?: () => void;
	placeholder?: string;
	label?: string;
	focus?: boolean;
}

export function Input({
	value,
	onChange,
	onSubmit,
	onCancel,
	placeholder = "",
	label,
	focus = true,
}: InputProps) {
	useInputFocus(focus);
	useEscapeKey(onCancel, focus);

	return (
		<box flexDirection="row">
			{label && (
				<Text fg={inkColor("cyan")} attributes={BOLD}>
					{label}:{" "}
				</Text>
			)}
			{focus ? (
				<input
					flexGrow={1}
					focused
					value={value}
					placeholder={placeholder}
					onInput={onChange}
					onSubmit={onSubmit as SubmitHandler | undefined}
					textColor={inkColor("white")}
					cursorColor={inkColor("cyan")}
				/>
			) : (
				<Text attributes={!value && placeholder ? DIM : 0}>
					{value || placeholder}
				</Text>
			)}
		</box>
	);
}
