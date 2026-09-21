import { Modal, Text } from "@components/common";
import { KeymapPriority, useKeymap } from "@hooks";
import { useDatabase } from "@hooks/useDatabase";
import { cachedProjects, setProjectFilter } from "@lib/linear/project-filter";
import { getBoardWorkflow } from "@lib/workflows/board-sync";
import { createProjectMachine } from "@lib/workflows/change-project";
import type { Board } from "@types";
import { DIM, inkColor, selection } from "@utils";
import { useMachine } from "@xstate/react";
import { useMemo, useState } from "react";

export function ChangeProjectModal({
	board,
	onClose,
}: {
	board: Board;
	onClose: () => void;
}) {
	const db = useDatabase();
	const { id, project_filter_id: projectId } = board;
	const machine = useMemo(
		() =>
			createProjectMachine({
				projects: cachedProjects(db, id),
				change: (selected) => {
					setProjectFilter(db, id, selected || null);
					getBoardWorkflow(db, id).actor.send({ type: "CACHE_CHANGED" });
				},
			}),
		[db, id],
	);
	const [state, send] = useMachine(
		machine.provide({ actions: { done: onClose, cancel: onClose } }),
	);
	const [selected, setSelected] = useState<number>();
	const { projects, error } = state.context;
	const index =
		selected ??
		Math.max(
			0,
			projects.findIndex((p) => p.id === (projectId ?? "")),
		);
	useKeymap({
		priority: KeymapPriority.overlay,
		handlers: {
			onUp: () => {
				if (state.matches("choosing")) setSelected(Math.max(0, index - 1));
			},
			onDown: () => {
				if (state.matches("choosing"))
					setSelected(Math.min(projects.length - 1, index + 1));
			},
			onSelect: () => {
				const project = projects[index];
				if (state.matches("choosing") && project) {
					if (project.id === (projectId ?? "")) send({ type: "CANCEL" });
					else send({ type: "SELECT", id: project.id });
				}
			},
			onBack: () => send({ type: "CANCEL" }),
		},
	});
	return (
		<Modal title="Change Project">
			<box flexDirection="column">
				{projects
					.slice(Math.max(0, index - 5), Math.max(0, index - 5) + 10)
					.map((project) => (
						<Text
							key={project.id}
							{...selection(project === projects[index], "cyan")}
						>
							{" "}
							{project.name}
							{project.id === (projectId ?? "") ? " (current)" : ""}{" "}
						</Text>
					))}
			</box>
			{error && <Text fg={inkColor("red")}>{error}</Text>}
			<Text attributes={DIM}>
				↑/↓ to select • Enter to filter • Esc to cancel
			</Text>
			<Text attributes={DIM}>
				Filters cached issues. Press r on the board to refresh Linear.
			</Text>
		</Modal>
	);
}
