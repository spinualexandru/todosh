import { Banner } from "@components/banner";
import { getTerminalSize } from "@hooks";
import {
	Box,
	render,
	Text,
	useApp,
	useInput,
	useIsScreenReaderEnabled,
	useStdout,
} from "ink";
import { useEffect, useMemo, useState } from "react";

function App() {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const isScreenReaderEnabled = useIsScreenReaderEnabled();
	const [{ columns, rows }, setTerminalSize] = useState(() =>
		getTerminalSize(stdout),
	);

	useEffect(() => {
		setTerminalSize(getTerminalSize(stdout));
		const handleResize = () => setTerminalSize(getTerminalSize(stdout));
		stdout?.on?.("resize", handleResize);
		return () => {
			stdout?.off?.("resize", handleResize);
		};
	}, [stdout]);

	useEffect(() => {
		// Clear screen + go home; hide cursor for a TUI feel.
		stdout?.write("\x1b[2J\x1b[H\x1b[?25l");
		return () => {
			stdout?.write("\x1b[?25h");
		};
	}, [stdout]);

	useInput((input, key) => {
		if (key.escape || input.toLowerCase() === "q") {
			exit();
		}
	});

	const content = useMemo(
		() =>
			isScreenReaderEnabled ? (
				<Box flexDirection="column" alignItems="center">
					<Text>Welcome to Todosh</Text>
					<Text dimColor>Press q or Esc to quit.</Text>
				</Box>
			) : (
				<Box flexDirection="column" alignItems="center">
					<Banner />
					<Text dimColor>Press q or Esc to quit.</Text>
				</Box>
			),
		[isScreenReaderEnabled],
	);

	return (
		<Box
			width={columns}
			height={rows}
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
			paddingY={1}
			justifyContent="center"
			alignItems="center"
			aria-label="Welcome to Todosh"
		>
			{content}
		</Box>
	);
}

render(<App />);
