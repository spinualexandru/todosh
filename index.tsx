import { AppProviders, BoardView, DashboardView, TableView } from "@components";
import { useKeymap, useRouter, useSettings } from "@hooks";
import { render, Text, useApp } from "ink";

function AppContent() {
	const { exit } = useApp();
	const { route, goBack, canGoBack } = useRouter();
	const { isLoading } = useSettings();

	useKeymap({
		handlers: {
			onQuit: () => exit(),
			onBack: () => {
				if (canGoBack) {
					goBack();
				} else {
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
			return (
				<Text>Detail view coming in Phase 5 (taskId: {route.taskId})</Text>
			);
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
