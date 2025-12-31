import {
	AppProviders,
	BoardView,
	DashboardView,
	DetailView,
	TableView,
} from "@components";
import { useKeymap, useRouter, useSettings } from "@hooks";
import { startSocketServer, stopSocketServer } from "@lib/ipc";
import { loadSettings } from "@lib/settings";
import { render, Text, useApp } from "ink";

const settings = loadSettings();
if (settings?.ipc?.enabled) {
	startSocketServer();
}

function AppContent() {
	const { exit } = useApp();
	const { route, goBack, canGoBack } = useRouter();
	const { isLoading } = useSettings();

	useKeymap({
		handlers: {
			onQuit: () => {
				stopSocketServer();
				exit();
			},
			onBack: () => {
				if (canGoBack) {
					goBack();
				} else {
					stopSocketServer();
					exit();
				}
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
		<AppProviders>
			<AppContent />
		</AppProviders>
	);
}

render(<App />);
