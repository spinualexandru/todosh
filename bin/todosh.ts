#!/usr/bin/env bun

const args = process.argv.slice(2);

if (args.length === 0) {
	// Launch TUI
	await import("../index.tsx");
} else {
	// Run CLI
	await import("../cli.ts");
}
