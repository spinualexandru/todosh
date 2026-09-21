import { linearError } from "@lib/linear";
import { assign, fromPromise, setup } from "xstate";

export interface Choice {
	id: string;
	name: string;
}
export interface ConnectionServices {
	hasKey: () => Promise<boolean>;
	saveKey: (key: string, signal: AbortSignal) => Promise<void>;
	teams: (signal: AbortSignal) => Promise<Choice[]>;
	projects: (teamId: string, signal: AbortSignal) => Promise<Choice[]>;
	connect: (
		teamId: string,
		projectId: string | undefined,
		signal: AbortSignal,
	) => Promise<unknown>;
}

export function createConnectionMachine(services: ConnectionServices) {
	return setup({
		types: {
			context: {} as {
				teams: Choice[];
				projects: Choice[];
				teamId: string;
				projectId: string;
				name: string;
				error?: string;
			},
			events: {} as
				| { type: "LOCAL" }
				| { type: "LINEAR" }
				| { type: "CHANGE_KEY" }
				| { type: "SAVE_KEY"; key: string }
				| { type: "TEAM"; id: string }
				| { type: "PROJECT"; id: string }
				| { type: "CREATE_LOCAL"; name: string }
				| { type: "BACK" }
				| { type: "CANCEL" }
				| { type: "RETRY" },
		},
		actors: {
			hasKey: fromPromise<boolean>(() => services.hasKey()),
			saveKey: fromPromise<void, string>(({ input, signal }) =>
				services.saveKey(input, signal),
			),
			teams: fromPromise<Choice[]>(({ signal }) => services.teams(signal)),
			projects: fromPromise<Choice[], string>(({ input, signal }) =>
				services.projects(input, signal),
			),
			connect: fromPromise<unknown, { teamId: string; projectId: string }>(
				({ input, signal }) =>
					services.connect(input.teamId, input.projectId || undefined, signal),
			),
		},
		actions: {
			clearError: assign({ error: undefined }),
			connected: () => {},
			localCreated: (_args, _params: { name: string }) => {},
			canceled: () => {},
		},
	}).createMachine({
		id: "connectBoard",
		initial: "source",
		context: { teams: [], projects: [], teamId: "", projectId: "", name: "" },
		on: { CANCEL: ".canceled" },
		states: {
			source: {
				entry: "clearError",
				on: { LOCAL: "local", LINEAR: "checkingKey", CHANGE_KEY: "key" },
			},
			local: {
				on: {
					BACK: "source",
					CREATE_LOCAL: {
						guard: ({ event }) => Boolean(event.name.trim()),
						target: "localComplete",
						actions: assign({ name: ({ event }) => event.name.trim() }),
					},
				},
			},
			checkingKey: {
				tags: "busy",
				invoke: {
					src: "hasKey",
					onDone: [
						{ guard: ({ event }) => event.output, target: "loadingTeams" },
						{ target: "key" },
					],
					onError: {
						target: "key",
						actions: assign({ error: ({ event }) => linearError(event.error) }),
					},
				},
			},
			key: { on: { BACK: "source", SAVE_KEY: { target: "savingKey" } } },
			savingKey: {
				tags: "busy",
				entry: "clearError",
				invoke: {
					src: "saveKey",
					input: ({ event }) => (event.type === "SAVE_KEY" ? event.key : ""),
					onDone: "loadingTeams",
					onError: {
						target: "key",
						actions: assign({ error: ({ event }) => linearError(event.error) }),
					},
				},
				// Native keychain writes cannot be undone; wait for their result before leaving.
				on: { CANCEL: {} },
			},
			loadingTeams: {
				tags: "busy",
				entry: "clearError",
				invoke: {
					src: "teams",
					onDone: [
						{
							guard: ({ event }) => event.output.length > 0,
							target: "team",
							actions: assign({ teams: ({ event }) => event.output }),
						},
						{
							target: "teamsFailed",
							actions: assign({ error: "Linear: no accessible teams found." }),
						},
					],
					onError: {
						target: "teamsFailed",
						actions: assign({ error: ({ event }) => linearError(event.error) }),
					},
				},
			},
			teamsFailed: {
				on: { RETRY: "loadingTeams", CHANGE_KEY: "key", BACK: "source" },
			},
			team: {
				on: {
					BACK: "source",
					TEAM: {
						guard: ({ context, event }) =>
							context.teams.some((t) => t.id === event.id),
						target: "loadingProjects",
						actions: assign({ teamId: ({ event }) => event.id, projectId: "" }),
					},
				},
			},
			loadingProjects: {
				tags: "busy",
				entry: "clearError",
				invoke: {
					src: "projects",
					input: ({ context }) => context.teamId,
					onDone: {
						target: "project",
						actions: assign({
							projects: ({ event }) => [
								{ id: "", name: "All team issues" },
								...event.output,
							],
						}),
					},
					onError: {
						target: "projectsFailed",
						actions: assign({ error: ({ event }) => linearError(event.error) }),
					},
				},
			},
			projectsFailed: { on: { RETRY: "loadingProjects", BACK: "team" } },
			project: {
				on: {
					BACK: "team",
					PROJECT: {
						guard: ({ context, event }) =>
							context.projects.some((p) => p.id === event.id),
						target: "connecting",
						actions: assign({ projectId: ({ event }) => event.id }),
					},
				},
			},
			connecting: {
				tags: "busy",
				entry: "clearError",
				invoke: {
					src: "connect",
					input: ({ context }) => ({
						teamId: context.teamId,
						projectId: context.projectId,
					}),
					onDone: "complete",
					onError: {
						target: "connectFailed",
						actions: assign({ error: ({ event }) => linearError(event.error) }),
					},
				},
			},
			connectFailed: { on: { RETRY: "connecting", BACK: "project" } },
			complete: { type: "final", entry: "connected" },
			localComplete: {
				type: "final",
				entry: {
					type: "localCreated",
					params: ({ context }) => ({ name: context.name }),
				},
			},
			canceled: { type: "final", entry: "canceled" },
		},
	});
}
