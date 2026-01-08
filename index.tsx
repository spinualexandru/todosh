import {
	AppProviders,
	BoardView,
	DashboardView,
	DetailView,
	TableView,
} from "@components";
import { useKeymap, useRouter, useSettings } from "@hooks";
import { getDatabase } from "@lib/db";
import { startSocketServer, stopSocketServer } from "@lib/ipc";
import { loadSettings } from "@lib/settings";
import type { Route } from "@types";
import { render, Text, useApp } from "ink";

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
	const { exit } = useApp();
	const { route } = useRouter();
	const { isLoading } = useSettings();

	useKeymap({
		handlers: {
			onQuit: () => {
				stopSocketServer();
				exit();
			},
		},
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

render(<App />);
