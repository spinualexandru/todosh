import type { Database } from "bun:sqlite";

import { linearError, linkedBoard, syncBoard } from "@lib/linear";
import { assign, createActor, fromPromise, setup } from "xstate";

type Job = {
	run: (signal: AbortSignal) => Promise<unknown>;
	resolve: (value: unknown) => void;
	refresh?: boolean;
};

/** One serial operation queue survives view changes; polling runs only while observed. */
export function createBoardWorkflow(
	refresh: (signal: AbortSignal) => Promise<unknown>,
	pollMs = 60000,
) {
	const refreshJob = (): Job => ({
		run: refresh,
		resolve: () => {},
		refresh: true,
	});
	const machine = setup({
		types: {
			context: {} as {
				queue: Job[];
				current?: Job;
				watchers: number;
				revision: number;
				error?: string;
			},
			events: {} as
				| { type: "RUN"; job: Job }
				| { type: "WATCH" }
				| { type: "UNWATCH" }
				| { type: "REFRESH" }
				| { type: "CACHE_CHANGED" },
		},
		actors: {
			work: fromPromise<unknown, Job>(({ input, signal }) => input.run(signal)),
		},
		actions: {
			refresh: assign({
				queue: ({ context }) =>
					context.current?.refresh || context.queue.some((j) => j.refresh)
						? context.queue
						: [...context.queue, refreshJob()],
			}),
		},
	}).createMachine({
		initial: "idle",
		context: { queue: [], watchers: 0, revision: 0 },
		on: {
			RUN: {
				actions: assign({
					queue: ({ context, event }) => [...context.queue, event.job],
				}),
			},
			WATCH: {
				actions: [
					assign({ watchers: ({ context }) => context.watchers + 1 }),
					"refresh",
				],
			},
			UNWATCH: {
				actions: assign({
					watchers: ({ context }) => Math.max(0, context.watchers - 1),
				}),
			},
			REFRESH: { actions: "refresh" },
			CACHE_CHANGED: {
				actions: assign({ revision: ({ context }) => context.revision + 1 }),
			},
		},
		states: {
			idle: {
				always: {
					guard: ({ context }) => context.queue.length > 0,
					target: "working",
					actions: assign({
						current: ({ context }) => context.queue[0],
						queue: ({ context }) => context.queue.slice(1),
						error: undefined,
					}),
				},
				after: {
					[pollMs]: {
						target: "idle",
						reenter: true,
						actions: assign({
							queue: ({ context }) =>
								context.watchers > 0 ? [refreshJob()] : [],
						}),
					},
				},
			},
			working: {
				invoke: {
					src: "work",
					input: ({ context }) => {
						if (!context.current) throw new Error("Missing board operation");
						return context.current;
					},
					onDone: {
						target: "idle",
						actions: [
							({ context, event }) => context.current?.resolve(event.output),
							assign({
								current: undefined,
								revision: ({ context }) => context.revision + 1,
							}),
						],
					},
					onError: {
						target: "idle",
						actions: [
							({ context }) => context.current?.resolve(null),
							assign({
								current: undefined,
								error: ({ event }) => linearError(event.error),
								revision: ({ context }) => context.revision + 1,
							}),
						],
					},
				},
			},
		},
	});
	const actor = createActor(machine).start();
	return {
		actor,
		run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
			if (actor.getSnapshot().status !== "active") return Promise.resolve(null);
			return new Promise((resolve) =>
				actor.send({
					type: "RUN",
					job: { run: work, resolve: (value) => resolve(value as T | null) },
				}),
			);
		},
		stop() {
			const { current, queue } = actor.getSnapshot().context;
			actor.stop();
			current?.resolve(null);
			for (const job of queue) job.resolve(null);
		},
	};
}
const workflows = new WeakMap<
	Database,
	Map<number, ReturnType<typeof createBoardWorkflow>>
>();
export function getBoardWorkflow(db: Database, boardId: number) {
	let boards = workflows.get(db);
	if (!boards) {
		boards = new Map();
		workflows.set(db, boards);
	}
	let workflow = boards.get(boardId);
	if (!workflow) {
		workflow = createBoardWorkflow(async (signal) => {
			if (linkedBoard(db, boardId))
				await syncBoard(db, boardId, undefined, signal);
		});
		boards.set(boardId, workflow);
	}
	return workflow;
}
export function stopBoardWorkflows(db: Database) {
	for (const workflow of workflows.get(db)?.values() ?? []) workflow.stop();
	workflows.delete(db);
}
