import { linearError } from "@lib/linear";
import { assign, setup } from "xstate";

import type { Choice } from "./connect-board";

export function createProjectMachine(services: {
	projects: Choice[];
	change: (id: string) => void;
}) {
	return setup({
		types: {
			context: {} as { projects: Choice[]; error?: string },
			events: {} as { type: "SELECT"; id: string } | { type: "CANCEL" },
		},
		actions: { done: () => {}, cancel: () => {} },
	}).createMachine({
		initial: "choosing",
		context: {
			projects: [{ id: "", name: "All projects" }, ...services.projects],
		},
		on: { CANCEL: ".canceled" },
		states: {
			choosing: {
				on: {
					SELECT: {
						guard: ({ context, event }) =>
							context.projects.some((p) => p.id === event.id),
						target: "applying",
						actions: assign({
							error: ({ event }) => {
								try {
									services.change(event.id);
									return undefined;
								} catch (e) {
									return linearError(e);
								}
							},
						}),
					},
				},
			},
			applying: {
				always: [
					{ guard: ({ context }) => !context.error, target: "complete" },
					{ target: "choosing" },
				],
			},
			complete: { type: "final", entry: "done" },
			canceled: { type: "final", entry: "cancel" },
		},
	});
}
