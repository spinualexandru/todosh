import {
	AppProviders,
	BoardView,
	DashboardView,
	DetailView,
	TableView,
	Text,
} from "@components";
import {
	KeymapPriority,
	useKeymap,
	useQuit,
	useRouter,
	useSettings,
} from "@hooks";
import { getDatabase } from "@lib/db";
import { startSocketServer, stopSocketServer } from "@lib/ipc";
import { loadSettings } from "@lib/settings";
import { createCliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";
import type { Route } from "@types";

const settings = await loadSettings();
if (settings?.ipc?.enabled) {
	startSocketServer();
}

// Compute initial route based on default board setting
let initialRoute: Route | undefined;
if (settings?.defaultBoard) {
	const db = getDatabase(settings.database?.path);
	const board = db
		.query<{ id: number }, [number]>(
			"SELECT id FROM boards WHERE id = ? AND archived = 0",
		)
		.get(settings.defaultBoard);
	if (board) {
		initialRoute = { view: "board", boardId: settings.defaultBoard };
	}
}

function AppContent() {
	const quit = useQuit();
	const { route } = useRouter();
	const { isLoading } = useSettings();

	useKeymap({
		handlers: { onQuit: quit },
		priority: KeymapPriority.root,
	});

	if (isLoading) {
		return <Text>Loading...</Text>;
	}

	switch (route.view) {
		case "dashboard":
			return <DashboardView />;
		case "board":
			return <BoardView boardId={route.boardId} />;
		case "table":
			return <TableView boardId={route.boardId} />;
		case "detail":
			return <DetailView boardId={route.boardId} taskId={route.taskId} />;
		default:
			return <DashboardView />;
	}
}

function App() {
	return (
		<AppProviders initialRoute={initialRoute}>
			<AppContent />
		</AppProviders>
	);
}

const renderer = await createCliRenderer({
	exitOnCtrlC: true,
	// Ctrl+C and exit signals route through destroy(), so the IPC socket is
	// unlinked on every shutdown path rather than only a clean quit.
	onDestroy: () => stopSocketServer(),
});

const keymap = createDefaultOpenTuiKeymap(renderer);

createRoot(renderer).render(
	<KeymapProvider keymap={keymap}>
		<App />
	</KeymapProvider>,
);
