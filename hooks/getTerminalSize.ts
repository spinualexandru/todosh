export function getTerminalSize(
	stdout: NodeJS.WriteStream | null | undefined,
): {
	columns: number;
	rows: number;
} {
	const columns = typeof stdout?.columns === "number" ? stdout.columns : 80;
	const rows = typeof stdout?.rows === "number" ? stdout.rows : 24;
	return {
		columns: Math.max(20, columns),
		rows: Math.max(8, rows),
	};
}
