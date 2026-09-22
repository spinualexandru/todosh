import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import { DatabaseContext } from "@contexts/database";
import { InputFocusProvider } from "@contexts/input-focus";
import { RouterProvider } from "@contexts/router";
import { SettingsContext } from "@contexts/settings";
import { useRouter } from "@hooks/useRouter";
import { SCHEMA } from "@lib/db";
import { migrate } from "@lib/db/migrate";
import { defaultSettings } from "@lib/settings";
import { stopBoardWorkflows } from "@lib/workflows/board-sync";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { useRenderer } from "@opentui/react";
import { testRender } from "@opentui/react/test-utils";
import { act, type ReactNode, useMemo } from "react";

import { TableView } from "./table";

function KeyboardProvider({ children }: { children: ReactNode }) {
	const renderer = useRenderer();
	const keymap = useMemo(
		() => createDefaultOpenTuiKeymap(renderer),
		[renderer],
	);
	return <KeymapProvider keymap={keymap}>{children}</KeymapProvider>;
}

function View() {
	const { route } = useRouter();
	return route.view === "detail" ? (
		<text>Opened task {route.taskId}</text>
	) : (
		<TableView boardId={1} />
	);
}

describe("table search keyboard navigation", () => {
	test.each(["default", "vim"] as const)(
		"navigates filtered rows while keeping query editing in %s mode",
		async (mode) => {
			const db = new Database(":memory:");
			db.exec(SCHEMA);
			migrate(db);
			db.run("INSERT INTO boards (id, name) VALUES (1, 'Search QA')");
			for (const [index, title] of [
				"Unrelated task",
				"Evaluate GPU transcription",
				"Evaluate GPU memory",
			].entries()) {
				db.run(
					"INSERT INTO tasks (id, board_id, title, position) VALUES (?, 1, ?, ?)",
					[index + 1, title, index],
				);
			}

			let ui!: Awaited<ReturnType<typeof testRender>>;
			await act(async () => {
				ui = await testRender(
					<KeyboardProvider>
						<SettingsContext.Provider
							value={{
								settings: {
									...defaultSettings,
									keybinds: { mode },
									ui: { ...defaultSettings.ui, useNerdfonts: false },
								},
								isLoading: false,
								updateSettings: () => {},
							}}
						>
							<DatabaseContext.Provider value={db}>
								<InputFocusProvider>
									<RouterProvider initialRoute={{ view: "table", boardId: 1 }}>
										<View />
									</RouterProvider>
								</InputFocusProvider>
							</DatabaseContext.Provider>
						</SettingsContext.Provider>
					</KeyboardProvider>,
					{ width: 120, height: 24 },
				);
			});
			const press = async (key: string) => {
				await act(async () => {
					ui.mockInput.pressKey(key);
					await Bun.sleep(25);
				});
				await act(async () => {
					await ui.renderOnce();
				});
			};
			const type = async (value: string) => {
				await act(async () => ui.mockInput.typeText(value));
				await act(async () => {
					await ui.renderOnce();
				});
			};
			// Inspect the captured highlight, not merely whether key dispatch succeeds.
			const selectedTitle = () => {
				const line = ui
					.captureSpans()
					.lines.find((line) =>
						line.spans.some(
							(span) => span.text.includes("Evaluate GPU") && span.bg.a > 0,
						),
					);
				return line?.spans.map((span) => span.text).join("");
			};

			try {
				await act(async () => {
					await ui.renderOnce();
				});
				await press("/");
				await type("evaluate gpu");
				expect(ui.captureCharFrame()).toContain("2 results");
				expect(ui.captureCharFrame()).not.toContain("Unrelated task");
				expect(selectedTitle()).toContain("Evaluate GPU transcription");
				await press("ARROW_DOWN");
				expect(selectedTitle()).toContain("Evaluate GPU memory");
				await press("ARROW_DOWN");
				expect(selectedTitle()).toContain("Evaluate GPU memory");
				await press("ARROW_UP");
				await press("ARROW_UP");
				expect(selectedTitle()).toContain("Evaluate GPU transcription");

				await type("jk");
				expect(ui.captureCharFrame()).toContain("evaluate gpujk");
				expect(ui.captureCharFrame()).toContain("0 results");
				await press("ARROW_DOWN");
				await press("ARROW_UP");
				await press("RETURN");
				expect(ui.captureCharFrame()).toContain("0 results");
				await press("BACKSPACE");
				await press("BACKSPACE");
				expect(ui.captureCharFrame()).toContain("2 results");
				await press("ESCAPE");
				expect(ui.captureCharFrame()).toContain("Unrelated task");
				expect(ui.captureCharFrame()).not.toContain("Esc to close");

				await press("/");
				await type("evaluate gpu");
				await press("ARROW_DOWN");
				await press("RETURN");
				expect(ui.captureCharFrame()).toContain("Opened task 3");
			} finally {
				await act(async () => {
					ui.renderer.destroy();
					stopBoardWorkflows(db);
				});
				db.close();
			}
		},
	);
});
