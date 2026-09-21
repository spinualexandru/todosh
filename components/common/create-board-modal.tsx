import { KeymapPriority, useKeymap } from "@hooks";
import { useDatabase } from "@hooks/useDatabase";
import { connectBoard, listProjects, listTeams } from "@lib/linear";
import { linearCredentials } from "@lib/linear/credentials";
import {
	type Choice,
	createConnectionMachine,
} from "@lib/workflows/connect-board";
import { DIM, inkColor, selection } from "@utils";
import { useMachine } from "@xstate/react";
import { useMemo, useState } from "react";

import { Input } from "./input";
import { Modal } from "./modal";
import { SecretInput } from "./secret-input";
import { Text } from "./text";

export function CreateBoardModal({
	onLocal,
	onConnected,
	onCancel,
}: {
	onLocal: (name: string) => void;
	onConnected: () => void;
	onCancel: () => void;
}) {
	const db = useDatabase();
	const usesEnvironmentKey = Boolean(process.env.LINEAR_API_KEY?.trim());
	const machine = useMemo(
		() =>
			createConnectionMachine({
				hasKey: async () => Boolean(await linearCredentials.get()),
				saveKey: (key, signal) =>
					linearCredentials.save(key, undefined, signal),
				teams: listTeams,
				projects: listProjects,
				connect: (teamId, projectId, signal) =>
					connectBoard(db, teamId, projectId, undefined, signal),
			}),
		[db],
	);
	const [state, send] = useMachine(
		machine.provide({
			actions: {
				connected: onConnected,
				canceled: onCancel,
				localCreated: (_args, params) => onLocal(params.name),
			},
		}),
	);
	const [name, setName] = useState("");
	const [selectionState, setSelection] = useState({
		step: state.value,
		index: 0,
	});
	const selected =
		selectionState.step === state.value ? selectionState.index : 0;
	const busy = state.hasTag("busy");
	const { error, teams, projects, teamId } = state.context;
	const options: Choice[] = state.matches("source")
		? [
				{ id: "local", name: "Create locally" },
				{ id: "linear", name: "Connect to Linear" },
				{ id: "key", name: "Update Linear API key" },
			]
		: state.matches("team")
			? teams
			: state.matches("project")
				? projects
				: state.matches("teamsFailed")
					? [
							{ id: "retry", name: "Retry" },
							{ id: "key", name: "Update Linear API key" },
						]
					: state.matches("projectsFailed") || state.matches("connectFailed")
						? [{ id: "retry", name: "Retry" }]
						: [];
	const select = () => {
		const choice = options[selected];
		if (!choice) return;
		if (state.matches("source"))
			send({
				type:
					choice.id === "local"
						? "LOCAL"
						: choice.id === "linear"
							? "LINEAR"
							: "CHANGE_KEY",
			});
		else if (state.matches("team")) send({ type: "TEAM", id: choice.id });
		else if (state.matches("project")) send({ type: "PROJECT", id: choice.id });
		else send({ type: choice.id === "key" ? "CHANGE_KEY" : "RETRY" });
	};
	const back = () =>
		send({ type: state.matches("source") || busy ? "CANCEL" : "BACK" });
	useKeymap({
		priority: KeymapPriority.overlay,
		isActive: !state.matches("local") && !state.matches("key"),
		handlers: {
			onUp: () =>
				setSelection({ step: state.value, index: Math.max(0, selected - 1) }),
			onDown: () =>
				setSelection({
					step: state.value,
					index: Math.min(Math.max(0, options.length - 1), selected + 1),
				}),
			onSelect: select,
			onBack: back,
		},
	});
	return (
		<Modal
			title={
				state.matches("key")
					? "Linear API key"
					: state.matches("team")
						? "Linear team"
						: state.matches("project")
							? `${teams.find((t) => t.id === teamId)?.name}: project`
							: "Create Board"
			}
		>
			{state.matches("key") ? (
				<box flexDirection="column">
					<Text>
						Create a personal API key in Linear Settings → Security &amp;
						access.
					</Text>
					<SecretInput
						busy={false}
						onCancel={back}
						onSubmit={(key) => send({ type: "SAVE_KEY", key })}
					/>
					<Text attributes={DIM}>
						Stored in your OS keychain. Enter to save • Esc to back.
					</Text>
				</box>
			) : state.matches("local") ? (
				<Input
					label="Name"
					value={name}
					onChange={setName}
					onSubmit={(name) => send({ type: "CREATE_LOCAL", name })}
					onCancel={back}
					placeholder="Enter board name..."
				/>
			) : (
				<box flexDirection="column">
					{options
						.slice(Math.max(0, selected - 5), Math.max(0, selected - 5) + 10)
						.map((choice) => (
							<Text
								key={choice.id}
								{...selection(choice === options[selected], "cyan")}
							>
								{" "}
								{choice.name}{" "}
							</Text>
						))}
				</box>
			)}
			{usesEnvironmentKey && (
				<Text attributes={DIM}>
					Using LINEAR_API_KEY. Unset it and restart to use a saved key.
				</Text>
			)}
			{error && <Text fg={inkColor("red")}>{error}</Text>}
			<Text attributes={DIM}>
				{busy
					? state.matches("savingKey")
						? "Validating and saving key…"
						: "Connecting to Linear… Esc to cancel"
					: "↑/↓ to select • Enter to continue • Esc to back"}
			</Text>
			{state.matches("source") && (
				<Text attributes={DIM}>
					Linear uses LINEAR_API_KEY when set, otherwise your OS keychain.
				</Text>
			)}
		</Modal>
	);
}
